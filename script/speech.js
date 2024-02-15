//Importation des deux objets JSON à partir des 2 fichiers externes
import { language } from "./language.js";
import { voix } from "./voix.js";

const myOwnKey = "a3773ef2cfdb43c18d25613cf9b58859"; //Votre clé d'api ici!


const url = 'https://voicerss-text-to-speech.p.rapidapi.com/?key='+myOwnKey;
let options = {
	method: 'POST',
	headers: {
		'content-type': 'application/x-www-form-urlencoded',
		'X-RapidAPI-Key': 'd8766a9c54msh346d5361a34f49bp120c7cjsn25c3b48040fe',
		'X-RapidAPI-Host': 'voicerss-text-to-speech.p.rapidapi.com'
	},
	body: new URLSearchParams({
		src: '',
		hl: 'fr-fr',
                v: 'Zola',
		r: '0',
		c: 'mp3',
		f: '8khz_8bit_mono'
	})
};

//Varibles pour la gestion de l'API
let  ctx;
let audio;

//Variables pour le noeud Analyser WebAudioApi
let analyser;
let tableauDonnees;
let tailleMemoireTampon;

//Variable pour la gestion du texte, language, voix
let texteArea;
let languageSelection;
let voiceSelection;
let voiceArray = [];//Array qui contient tous les elements d'options pour la voix actuelle (cad actuellement afficher dans le DOM)

//Variables pour le canvas d'oscillation
let canvas;
let WIDTH;
let HEIGHT;
let ctxCanvas;

//Variables de gestion du pitch
let pitchSlider;
let pitchReset;

let visualisationSelect;


window.addEventListener("DOMContentLoaded",init);

function init(){
    //Assignation des diffférentes variables objets dans l'html à récupérée après chargement du DOM

    texteArea = document.getElementById("texte");
    languageSelection = document.getElementById("languages");
    voiceSelection = document.getElementById("voice");
    canvas = document.getElementById('visualisationCanvas');
    ctxCanvas = canvas.getContext("2d");
    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    pitchSlider = document.getElementById("pitchSlider");
    pitchReset = document.getElementById("resetPitch");
    visualisationSelect = document.getElementById("whatToShow");

    //Ajout de la gestion d'évenement des différents éléments
    //Si le bouton start est cliqué on veut lancer start (=récupération des informations puis envoie de la requette avant de jouer le résultat)
    document.getElementById("start").addEventListener("click",start);
    //Si on change l'option du language on veut mettre à jour les voix proposée, avec la procédure voiceUpdate
    languageSelection.addEventListener("change", voiceUpdate);
    //On utilise une fonction anonyme pour que si on click sur le bouton pitchReset le pitch soit remit à sa valeur initiale
    pitchReset.addEventListener("click", ()=>{pitchSlider.value=0;});
    //On veut que ca soit le bon affichage par défaut sur le canvas quand on choisit une onde ou un spectre
    visualisationSelect.addEventListener("change",visualisationUpdate);

    //Fonction d'initialisation des interfaces
    initLanguageSelect();
    voiceUpdate();
    initOscillo();
    visualisationUpdate();
}

function start(){
    ctx = new AudioContext();
    //Creation du noeuds Analyser dans le context audio pour visualisation du son, puis initialisation des paramètres associés
    analyser = ctx.createAnalyser();
    //On regarde si on doit afficher le spectrogramme ou l'onde.
    if(visualisationSelect.value == "oscillo"){
        analyser.fftSize = 2048;
        tailleMemoireTampon = analyser.frequencyBinCount;
        tableauDonnees = new Uint8Array(tailleMemoireTampon);
    //Appelle de la fonction qui va afficher la visualisation de l'onde dans le canvas
        afficherOscillo();
    }
    else{
        analyser.fftSize = 256;
        tailleMemoireTampon = analyser.frequencyBinCount;
        tableauDonnees = new Uint8Array(tailleMemoireTampon);
        afficherSpectre();
    }



    //On récupère les différentes info nécessaire pour changer la requête avec le texte, la langue et la voix voulue
    let texte = texteArea.value;
    let langue = languageSelection.value;
    let qui = voiceSelection.value;
    changeRequest(texte, langue, qui);

	fetch(url, options)
        .then((data) => {
            return data.arrayBuffer()
        })
	    .then(arrayBuffer => {
            return ctx.decodeAudioData(arrayBuffer)
        })
	    .then(decodedAudio => {
		    audio = decodedAudio;
            console.log(audio.duration)
	    })
        .then(playback)
        .then(()=>{
            console.log("DONE");
        })

}

function changeRequest(texte, langue, locuteur){
    options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'X-RapidAPI-Key': 'd8766a9c54msh346d5361a34f49bp120c7cjsn25c3b48040fe',
            'X-RapidAPI-Host': 'voicerss-text-to-speech.p.rapidapi.com'
        },
        body: new URLSearchParams({
            src: texte,
            hl: langue,
            v: locuteur,
            r: '0',
            c: 'mp3',
            f: '8khz_8bit_mono'
        })
    };
}

//Joue le son quand chargé et si possible
function playback() {
    return new Promise((resolve,reject)=>{
        const playSound = ctx.createBufferSource();
        //On change le pitch sur le buffer : https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/detune
        playSound.detune.value = pitchSlider.value;
        playSound.buffer = audio;
        //On oublie pas de connecter le noeuds analyser à celui qui va jouer le son
        playSound.connect(analyser);
        analyser.connect(ctx.destination);
        playSound.start(ctx.currentTime);

        setTimeout(() => {
            playSound.stop();
            resolve();
        }, audio.duration*1000);

    })
}    

//Remplis le menue déroulant des langues avec toutes les langues dans le JSON language
function initLanguageSelect(){

    for(const langue in (language)){
        let cle = langue;
        let valeur = language[langue];

        let newElement = document.createElement('option');
        newElement.value = valeur;
        newElement.innerHTML = cle;

        languageSelection.appendChild(newElement);
    }
}
//Quand on changeras de langue on voudras que les voix proposée soient aussi changée
function voiceUpdate(){
    //D'abord on supprime les anciennes
    for(const i in voiceArray){
        voiceArray[i].remove();
    }

    let nouvelleLangue = languageSelection.value;

    //On boucle sur toutes les voix de la nouvelle langue pour les ajouté à la fois dans le dom et dans l'array
    for(const i in voix[nouvelleLangue]){
        let nom = voix[nouvelleLangue][i];
        let newElement = document.createElement("option")
        newElement.value = nom;
        newElement.innerHTML = nom;
        voiceSelection.appendChild(newElement);
        voiceArray.push(newElement);
    }

}

function visualisationUpdate(){
    if(visualisationSelect.value == "oscillo"){
        initOscillo();
    }
    else{
        initSpectre();
    }
}

//Affiche la visualisation de l'onde
function afficherOscillo() {

    requestAnimationFrame(afficherOscillo);

    analyser.getByteTimeDomainData(tableauDonnees);

    ctxCanvas.fillStyle = 'rgb(200, 200, 200)';
    ctxCanvas.fillRect(0, 0, WIDTH, HEIGHT);

    ctxCanvas.lineWidth = 2;
    ctxCanvas.strokeStyle = 'rgb(0, 0, 0)';

    ctxCanvas.beginPath();

    var sliceWidth = WIDTH * 1.0 / tailleMemoireTampon;
    var x = 0;

    for(var i = 0; i < tailleMemoireTampon; i++) {

      var v = tableauDonnees[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        ctxCanvas.moveTo(x, y);
      } else {
        ctxCanvas.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctxCanvas.lineTo(canvas.width, canvas.height/2);
    ctxCanvas.stroke();
 };
//fonction qui affiche dans le canvas le spectrogram
 function afficherSpectre() {
    requestAnimationFrame(afficherSpectre);

    analyser.getByteFrequencyData(tableauDonnees);

    ctxCanvas.fillStyle = 'rgb(200, 200, 200)';
    ctxCanvas.fillRect(0, 0, WIDTH, HEIGHT);

    const barLargeur = (WIDTH / tailleMemoireTampon) * 2.5;
    let barHauteur;
    let x = 0;

    for (let i = 0; i < tailleMemoireTampon; i++) {
        barHauteur = tableauDonnees[i] / 2;
      
        ctxCanvas.fillStyle = `rgb(${barHauteur + 100} 50 50)`;
        ctxCanvas.fillRect(x, HEIGHT - barHauteur / 2, barLargeur, barHauteur);
      
        x += barLargeur + 1;
      }
      
 };

//Fonction qui initialise le canvas ou apparaiteras l'onde
function initOscillo(){
    ctxCanvas.fillStyle = 'rgb(200, 200, 200)';
    ctxCanvas.fillRect(0, 0, WIDTH, HEIGHT);
    ctxCanvas.lineWidth = 2;
    ctxCanvas.strokeStyle = 'rgb(0, 0, 0)';
    ctxCanvas.beginPath();
    var sliceWidth = WIDTH * 1.0 / 1024;
    var x = 0;
    var y = HEIGHT/2;
    ctxCanvas.moveTo(x, y);
    ctxCanvas.lineTo(canvas.width, canvas.height/2);
    ctxCanvas.stroke();
}

//Fonction qui initialise le canvas ou apparaiteras le spectre
function initSpectre(){
    ctxCanvas.fillStyle = 'rgb(200, 200, 200)';
    ctxCanvas.fillRect(0, 0, WIDTH, HEIGHT);
}