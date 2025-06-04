const amqp = require('amqplib');

const REQ_QUEUE = process.env.REQ_QUEUE || 'requests';
const RESP_QUEUE = process.env.RESP_QUEUE || 'responses';

// consumer.js

// Table de correspondance Morse
const MORSE_CODE = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D',
  '.': 'E', '..-.': 'F', '--.': 'G', '....': 'H',
  '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P',
  '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
  '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z',
  '-----': '0', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7',
  '---..': '8', '----.': '9',
  '.-.-.-': '.', '--..--': ',', '..--..': '?', '-.-.--': '!',
  '-....-': '-', '-..-.': '/', '.--.-.': '@', '-.--.': '(',
  '-.--.-': ')', '...-..-': '$', '.-...': '&'
};

function decodeMorse(morseString) {
  if (typeof morseString !== 'string') {
    throw new TypeError('Le message morse doit être une chaîne de caractères');
  }
  return morseString.trim()
    .split(' ') // sépare les codes morse
    .map(code => MORSE_CODE[code] || '') // traduit chaque code
    .join('');
}

function decodeBase64(base64String) {
  if (typeof base64String !== 'string') {
    throw new TypeError('Le message base64 doit être une chaîne de caractères');
  }
  // Buffer.from supporte string ou buffer
  return Buffer.from(base64String, 'base64').toString('utf-8');
}

function decodeRot13(rot13String) {
  if (typeof rot13String !== 'string') {
    throw new TypeError('Le message rot13 doit être une chaîne de caractères');
  }
  return rot13String.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
  });
}

function parseJsonExtract(jsonString) {
  if (typeof jsonString !== 'string') {
    throw new TypeError('Le message json_extract doit être une chaîne de caractères');
  }
  // On essaie de parser proprement
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // message mal formé, on log et renvoie null ou un fallback
    console.error('Erreur JSON:', e.message, 'pour la chaîne:', jsonString);
    return null;
  }
}

// Fonction principale de décodage selon le type
function decodeMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new TypeError('Le message doit être un objet');
  }

  const { type, value } = message;

  if (value === undefined || value === null) {
    throw new TypeError('Le champ "value" est absent ou null');
  }

  switch (type) {
    case 'morse':
      return decodeMorse(value);
    case 'base64':
      return decodeBase64(value);
    case 'rot13':
      return decodeRot13(value);
    case 'json_extract':
      return parseJsonExtract(value);
    default:
      throw new Error(`Type inconnu: ${type}`);
  }
}

messages = [
    {"agent":"thomas","type":"json_extract","payload":{"agent": "Agent15", "code": "Pytf", "mission": "TopSecret"}},
    {"agent":"lucasd","type":"base64","payload":"QWdlbnQ2X0xlVmpBIQ=="},
    {"agent":"lucasdsm","type":"rot13","payload":"Ntrag22_7352H!"},
    {"agent":"leo","type":"morse","payload":".- --. . -. - .---- ..... .-- ..--- ...- --... .--- -.-.--"}
];

for (const message of messages) {
  try {
    const decoded = decodeMessage({
      type: message.type,
      value: message.payload
    });
    console.log(`Décodage réussi pour ${message.agent}:`, decoded);
  } catch (error) {
    console.error(`Erreur lors du décodage pour ${message.agent}:`, error.message);
  }
}