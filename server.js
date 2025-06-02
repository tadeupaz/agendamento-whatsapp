require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const horarios = {
  'Cílios': 120,
  'Depilação': 30,
  'Sobrancelhas': 60
};

const agenda = []; // Agenda em memória

// Utilitário para gerar horários disponíveis
function gerarHorarios(servico) {
  const duracao = horarios[servico];
  const disponiveis = [];
  let inicio = 17 * 60; // 17:00 em minutos
  const fim = 22 * 60;

  while (inicio + duracao <= fim) {
    const h = Math.floor(inicio / 60).toString().padStart(2, '0');
    const m = (inicio % 60).toString().padStart(2, '0');
    const horarioTexto = `${h}:${m}`;

    const jaOcupado = agenda.find(a =>
      a.horario === horarioTexto
    );

    if (!jaOcupado) disponiveis.push(horarioTexto);

    inicio += 15; // Avança em blocos de 15 min
  }

  return disponiveis;
}

const estados = {}; // Armazena onde cada cliente está na conversa

app.post('/webhook', async (req, res) => {
  const { sender, message } = req.body;
  const texto = message?.text?.body?.trim();

  if (!texto) return res.sendStatus(200);

  const numero = sender;
  const estado = estados[numero] || {};

  if (!estado.etapa) {
    estados[numero] = { etapa: 'servico' };
    return enviarMensagem(numero, 'Olá! Qual serviço você deseja agendar?\n1️⃣ Cílios\n2️⃣ Depilação\n3️⃣ Sobrancelhas');
  }

  if (estado.etapa === 'servico') {
    let servico = '';
    if (texto === '1') servico = 'Cílios';
    else if (texto === '2') servico = 'Depilação';
    else if (texto === '3') servico = 'Sobrancelhas';
    else return enviarMensagem(numero, 'Escolha uma opção válida: 1, 2 ou 3.');

    estados[numero] = { etapa: 'horario', servico };
    const horariosDisponiveis = gerarHorarios(servico);
    if (horariosDisponiveis.length === 0) {
      return enviarMensagem(numero, `Não há horários disponíveis para ${servico} hoje.`);
    }

    const lista = horariosDisponiveis.map((h, i) => `${i + 1}️⃣ ${h}`).join('\n');
    estados[numero].opcoes = horariosDisponiveis;

    return enviarMensagem(numero, `Escolha um horário para *${servico}*:\n${lista}`);
  }

  if (estado.etapa === 'horario') {
    const indice = parseInt(texto) - 1;
    const horarioEscolhido = estado.opcoes?.[indice];

    if (!horarioEscolhido) return enviarMensagem(numero, 'Escolha um número válido da lista.');

    estados[numero].horario = horarioEscolhido;
    estados[numero].etapa = 'nome';

    return enviarMensagem(numero, 'Por favor, digite seu nome:');
  }

  if (estado.etapa === 'nome') {
    estados[numero].nome = texto;
    estados[numero].etapa = 'telefone';
    return enviarMensagem(numero, 'Agora digite seu número de telefone para confirmação:');
  }

  if (estado.etapa === 'telefone') {
    const { nome, servico, horario } = estados[numero];
    agenda.push({ nome, servico, horario, telefone: texto });

    estados[numero] = null;

    return enviarMensagem(numero,
      `✅ Agendamento confirmado!\n\n🧍 Nome: *${nome}*\n📞 Telefone: *${texto}*\n💅 Serviço: *${servico}*\n🕒 Horário: *${horario}*`
    );
  }

  res.sendStatus(200);
});

// Função para enviar mensagem via Z-API
async function enviarMensagem(numero, texto) {
  const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-message`;

  try {
    await axios.post(url, {
      phone: numero,
      message: texto
    });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});

