const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN; // Ex: "TOKEN123"
const ZAPI_API_URL = process.env.ZAPI_API_URL; // Ex: "https://api.z-api.io/instance123"

const gatilhos = [
  'oi', 'olá', 'ola', 'Oi', 'Olá', 'Ola', 'dia', 'tarde', 'noite',
  'cilios', 'Cílios', 'depilação', 'Depilacao', 'Depilação',
  'sobrancelhas', 'Sombrancelhas', 'Sobrancelhas'
];

app.get('/', (req, res) => {
  res.send('Bot de agendamento rodando...');
});

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const message = body?.message?.text?.body || '';
    const phone = body?.message?.from || '';
    
    const gatilho = gatilhos.find(palavra => message.toLowerCase().includes(palavra.toLowerCase()));
    
    if (gatilho) {
      const texto = `Olá! 👋\nEscolha o serviço para agendamento:\n\n1️⃣ Cílios (2h)\n2️⃣ Depilação (30min)\n3️⃣ Sobrancelhas (1h)\n\nResponda com o número do serviço.`;

      await axios.post(`${ZAPI_API_URL}/send-text`, {
        phone: phone,
        message: texto
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ZAPI_TOKEN
        }
      });
    }

    res.sendStatus(200); // Z-API exige resposta 200 OK
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});