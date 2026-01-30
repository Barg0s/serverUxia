const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PeticioAnalisi = require('../models/PeticioAnalisi');
const Resposta = require('../models/Resposta');
const fs = require('fs');
const path = require('path');

const createResponse = (status, message, data = null) => ({ status, message, data });

// Helper: guarda primera imatge base64 en uploads y devuelve path relativo
async function saveFirstBase64Image(base64String) {
  const matches = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  let ext = 'jpg';
  let data = base64String;
  if (matches) {
    ext = matches[1].split('/')[1];
    data = matches[2];
  }
  const buffer = Buffer.from(data, 'base64');
  const filename = `img_${Date.now()}.${ext}`;
  const savePath = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
  const fullpath = path.join(savePath, filename);
  await fs.promises.writeFile(fullpath, buffer);
  return fullpath; // ruta absoluta
}

// POST /api/peticions/afegir
router.post('/afegir', auth, async (req, res) => {
  const { model, prompt, imatges } = req.body;
  if (!model) return res.status(400).json(createResponse('ERROR', 'El camp model és obligatori'));
  if (!prompt) return res.status(400).json(createResponse('ERROR', 'El camp prompt és obligatori'));
  if (!imatges || !Array.isArray(imatges) || imatges.length === 0) {
    return res.status(400).json(createResponse('ERROR', 'Es requereix almenys una imatge'));
  }

  try {
    // guarda la primera imatge en uploads (opcional)
    const first = imatges[0];
    const savedPath = await saveFirstBase64Image(first);

    const peticio = await PeticioAnalisi.create({
      imagePath: savedPath,
      prompt,
      modelUsed: model,
      UsuariId: req.user.id
    });

    // por ahora simulamos respuesta (sin IA)
    const resposta = await Resposta.create({
      text: 'Respost simulada: processament pendent.',
      tags: []
    });

    await peticio.setResposta(resposta);

    return res.json(createResponse('OK', 'Petició processada correctament', {
      peticioId: peticio.id,
      respostaId: resposta.id
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(createResponse('ERROR', 'Error intern processant la petició'));
  }
});

module.exports = router;
