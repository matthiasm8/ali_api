const amqp = require('amqplib');

const REQ_QUEUE = process.env.REQ_QUEUE || 'requests';
const RESP_QUEUE = process.env.RESP_QUEUE || 'responses';

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
    .split(' ')
    .map(code => MORSE_CODE[code] || '')
    .join('');
}

function decodeBase64(base64String) {
  if (typeof base64String !== 'string') {
    throw new TypeError('Le message base64 doit être une chaîne de caractères');
  }
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

function parseJsonExtract(jsonInput) {
  if (typeof jsonInput === 'object' && jsonInput !== null) {
    return jsonInput; 
  }
  if (typeof jsonInput === 'string') {
    try {
      return JSON.parse(jsonInput);
    } catch (e) {
      console.error('Erreur JSON:', e.message, 'pour la chaîne:', jsonInput);
      return null;
    }
  }
  console.error('Type de payload non supporté :', typeof jsonInput);
  return null;
}


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

module.exports = {
  decodeMorse,
  decodeBase64,
  decodeRot13,
  parseJsonExtract,
  decodeMessage,
};


async function start() {
    const conn = await amqp.connect('amqp://135.125.89.160');
    const ch = await conn.createChannel();

    await ch.assertExchange('amq.fanout', 'fanout');
    const q = await ch.assertQueue('', { exclusive: true });
    await ch.bindQueue(q.queue, 'amq.fanout', '');
    await ch.assertQueue(RESP_QUEUE, { durable: true });

    console.log('En attente des messages dans %s...', REQ_QUEUE);

    ch.consume(q.queue, msg => {
        try {
            const input = msg.content.toString();
            console.log("Message reçu :", input);

            const parsed = JSON.parse(input);

            let decodedMessage;

            switch (parsed.type) {
                case 'morse':
                    decodedMessage = decodeMorse(parsed.payload);
                    break;
                case 'rot13':
                    decodedMessage = decodeRot13(parsed.payload);
                    break;
                case 'base64':
                    decodedMessage = decodeBase64(parsed.payload);
                    break;
                case 'json_extract':
                    const jsonObj = parseJsonExtract(parsed.payload);
                    decodedMessage = `Agent: ${jsonObj.agent}, Mission: ${jsonObj.mission}`;
                    break;
                default:
                    decodedMessage = "Type inconnu";
            }

            if (parsed.agent === 'matthias') {
                const response = {
                    message: `MATTHIAS: ${decodedMessage}`,
                };
                ch.sendToQueue(RESP_QUEUE, Buffer.from(JSON.stringify(response)));
                console.log("Réponse envoyée :", response);
            }

            ch.ack(msg);

        } catch (error) {
            console.error("Erreur de traitement :", error);
            ch.nack(msg, false, false);
        }
    });
}

start().catch(console.error);

