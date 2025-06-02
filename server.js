const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config();

app.use(bodyParser.json());

const usuarios = {};

const gatilhosIniciais = [
  'oi', 'Oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite',
  'dia', 'tarde', 'noite', 'Bom dia', 'Boa tarde', 'Boa Noite',
  'cilios', 'cílios', 'depilacao', 'depilação', 'sobrancelhas', 'sombrancelhas'
];

app.get('/', (req, res) => {
  res.send('Bot de agendamento rodando...');
});


// Serviços e suas durações
const servicos = {
  1: { nome: 'Cílios', duracao: 120 },
  2: { nome: 'Depilação', duracao: 30 },
  3: { nome: 'Sobrancelhas', duracao: 60 }
};

// Gerar horários disponíveis das 17h às 22h
function gerarHorarios(servicoMinutos) {
  const inicio = 17 * 60;
  const fim = 22 * 60;
  const horarios = [];

  for (let t = inicio; t + servicoMinutos <= fim; t += servicoMinutos) {
    const h = Math.floor(t / 60).toString().padStart(2, '0');
    const m = (t % 60).toString().padStart(2, '0');
    horarios.push(`${h}:${m}`);
  }

  return horarios;
}

//const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-text`;
function enviarMensagem(numero, texto) {
  const url = `https://api.z-api.io/instances/3E21F16C3E0720385B1862AF4B231A0B/token/D257E6B472C928BD4A3C1734/send-text`;
  return axios.post(url, {
    phone: numero,
    message: texto
  });
}

// Webhook Z-API
app.post('/webhook', async (req, res) => {
  const body = req.body;
  const numero = body?.data?.phone;
  const mensagem = body?.data?.message?.text?.toLowerCase() || '';
//  const numero = body.phone;
//  const mensagem = body.message?.toLowerCase() || '';

  if (!numero || !mensagem) {
    console.log('Mensagem inválida recebida:', JSON.stringify(body, null, 2));
    return res.sendStatus(200);
  }

  if (!usuarios[numero]) {
    usuarios[numero] = { etapa: 0 };
  }

  const user = usuarios[numero];

  try {
    if (user.etapa === 0) {
      if (gatilhosIniciais.some(g => mensagem.includes(g))) {
        await enviarMensagem(numero, 'Olá! Bem-vindo(a) ao sistema de agendamento. Escolha um serviço:\n1. Cílios (2h)\n2. Depilação (30min)\n3. Sobrancelhas (1h)');
        user.etapa = 1;
      }
    } else if (user.etapa === 1) {
      if (['1', '2', '3'].includes(mensagem)) {
        user.servico = servicos[mensagem];
        user.etapa = 2;
        await enviarMensagem(numero, `Ótimo! Você escolheu *${user.servico.nome}*.\nPor favor, informe seu *nome completo*.`);
      } else {
        await enviarMensagem(numero, 'Escolha inválida. Envie 1, 2 ou 3.');
      }
    } else if (user.etapa === 2) {
      user.nome = mensagem;
      user.etapa = 3;
      await enviarMensagem(numero, `Obrigado, ${user.nome}. Agora envie seu *telefone* com DDD.`);
    } else if (user.etapa === 3) {
      user.telefoneCliente = mensagem;
      user.etapa = 4;

      const horarios = gerarHorarios(user.servico.duracao);
      const lista = horarios.map((h, i) => `${i + 1}. ${h}`).join('\n');
      user.horarios = horarios;

      await enviarMensagem(numero, `Perfeito! Escolha um dos horários disponíveis:\n${lista}`);
    } else if (user.etapa === 4) {
      const idx = parseInt(mensagem) - 1;
      if (idx >= 0 && idx < user.horarios.length) {
        const horarioEscolhido = user.horarios[idx];
        await enviarMensagem(numero, `Agendamento confirmado para *${user.servico.nome}* às *${horarioEscolhido}*.\nNome: ${user.nome}\nTelefone: ${user.telefoneCliente}`);
        delete usuarios[numero]; // resetar fluxo
      } else {
        await enviarMensagem(numero, 'Opção inválida. Escolha um número da lista.');
      }
    }
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err.message);
  }

  res.sendStatus(200);
});

// Teste GET opcional
app.get('/webhook', (req, res) => {
  res.json({ message: 'Webhook de agendamento ativo.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});