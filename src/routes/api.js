const express = require('express');
const router = express.Router();
const { User, AnalysisRequest, Response } = require('../models');
const { createResponse } = require('../utils/response');
const { authMiddleware } = require('../middleware/auth');
const { Op, fn, col } = require('sequelize');

// --- Endpoints de Usuario (App Móvil) ---

// POST /api/usuaris/registrar
// Registra un nuevo usuario en la base de datos
router.post('/usuaris/registrar', async (req, res) => {
    try {
        const { nickname, email, telefon } = req.body;

        // Comprobar si el email ya existe
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json(createResponse('ERROR', 'Usuari ja existent'));
        }

        // Crear el usuario con rol 'normal' y sin validar
        const user = await User.create({
            nickname,
            email,
            telefon,
            validat: false,
            role: 'normal'
        });

        // Respuesta exitosa
        return res.status(201).json(createResponse('OK', "L'usuari s'ha creat correctament", {
            nickname: user.nickname,
            email: user.email
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al registrar usuari'));
    }
});

// POST /api/usuaris/validar
// Simula la validación por SMS y genera la API Key
router.post('/usuaris/validar', async (req, res) => {
    try {
        const { telefon, codi_validacio } = req.body;

        // Buscar usuario por teléfono
        const user = await User.findOne({ where: { telefon } });

        if (!user) {
            return res.status(404).json(createResponse('ERROR', 'Usuari no trobat'));
        }

        // Aquí iría la lógica real de comprobar el código SMS.
        // Lo simulamos aceptando cualquier código.

        // Generamos una API Key única para el usuario
        const apiKey = 'ABCD' + Date.now() + 'EFGH';

        user.validat = true;
        user.api_key = apiKey;
        await user.save(); // Guardamos cambios en BD

        return res.json(createResponse('OK', 'Usuari validat correctament', { api_key: apiKey }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al validar usuari'));
    }
});

// GET /api/usuaris/perfil
// Devuelve los datos del usuario. Requiere autenticación (Bearer Token)
router.get('/usuaris/perfil', authMiddleware, (req, res) => {
    // req.user viene relleno gracias al authMiddleware
    const { nickname, email, telefon, validat, tos } = req.user;
    return res.json(createResponse('OK', "Informació de l'usuari obtinguda correctament", {
        nickname, email, telefon, validat, tos
    }));
});

// --- Endpoints de Administrador (Desktop App) ---

// POST /api/admin/usuaris/login
// Autenticación para administradores
router.post('/admin/usuaris/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscamos usuario con rol 'admin' y ese email
        const user = await User.findOne({ where: { email, role: 'admin' } });

        // Verificamos contraseña (en texto plano por simplicidad del sprint)
        if (user && user.password === password) {
            // Generamos un token de sesión (que guardamos como api_key)
            const token = 'ADMIN' + Date.now() + 'TOKEN';
            user.api_key = token;
            await user.save();

            return res.json(createResponse('OK', 'Usuari autenticat correctament', { token }));
        } else {
            return res.status(401).json(createResponse('ERROR', 'Credencials invàlides'));
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al login'));
    }
});

// POST /api/admin/usuaris/logout
// Cierra sesión eliminando el token de la base de datos
router.post('/admin/usuaris/logout', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        user.api_key = null;
        await user.save();
        return res.json(createResponse('OK', 'Sessió tancada correctament'));
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al tancar sessió'));
    }
});

// POST /api/admin/usuaris/testtoken
// Verifica si el token es válido
router.post('/admin/usuaris/testtoken', authMiddleware, (req, res) => {
    return res.json(createResponse('OK', 'Token vàlid', {
        user: {
            email: req.user.email,
            role: req.user.role
        }
    }));
});

// GET /api/admin/usuaris
// Listado de todos los usuarios (Solo para admins)
router.get('/admin/usuaris', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json(createResponse('ERROR', 'Accés denegat'));
    }

    try {
        const users = await User.findAll({
            attributes: ['nickname', 'email', 'telefon', 'validat', 'tos']
        });
        return res.json(createResponse('OK', 'Consulta realitzada correctament', users));
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al llistar usuaris'));
    }
});

// --- Endpoint de Análisis de Imagen (Real con Ollama) ---

// POST /api/analitzar-imatge
// Recibe una imagen en Base64, la envía a Ollama para análisis,
// guarda petición y respuesta en la BD, y retorna descripción + tags.
// SIN autenticación (según especificación tarea 10)
router.post('/analitzar-imatge', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json(createResponse('ERROR', 'Cal enviar una imatge en base64'));
        }

        const startTime = Date.now();

        // Guardar la petición en la BD
        const analysisRequest = await AnalysisRequest.create({
            imageId: 'IMG_' + Date.now(),
            prompt: 'Descriu aquesta imatge en català. Dona una descripció detallada i una llista de tags.',
            imageBase64: image
        });

        // URL de Ollama (configurar también por env var)
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const ollamaModel = process.env.OLLAMA_MODEL || 'llava';

        let description = '';
        let tags = [];

        try {
            // Llamar a Ollama con la imagen
            const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: ollamaModel,
                    prompt: 'Descriu aquesta imatge en català. Dona una descripció detallada. Al final, proporciona una llista de tags separats per comes, precedida per "Tags:".',
                    images: [image],
                    stream: false
                })
            });

            if (!ollamaResponse.ok) {
                throw new Error(`Ollama ha respost amb status ${ollamaResponse.status}`);
            }

            const ollamaData = await ollamaResponse.json();
            const fullResponse = ollamaData.response || '';

            // Extraer descripción y tags de la respuesta
            const tagIndex = fullResponse.toLowerCase().lastIndexOf('tags:');
            if (tagIndex !== -1) {
                description = fullResponse.substring(0, tagIndex).trim();
                const tagsStr = fullResponse.substring(tagIndex + 5).trim();
                tags = tagsStr.split(',').map(t => t.trim().replace(/^[#\-•]\s*/, '')).filter(t => t.length > 0);
            } else {
                description = fullResponse.trim();
                // Generar tags automáticos con una segunda llamada
                const tagsResponse = await fetch(`${ollamaUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: ollamaModel,
                        prompt: 'Dona exactament 5 tags en català per a aquesta imatge, separats per comes. Només els tags, res més.',
                        images: [image],
                        stream: false
                    })
                });

                if (tagsResponse.ok) {
                    const tagsData = await tagsResponse.json();
                    tags = (tagsData.response || '').split(',').map(t => t.trim()).filter(t => t.length > 0);
                }
            }

        } catch (ollamaError) {
            console.error('Error amb Ollama:', ollamaError.message);
            // Fallback si Ollama no está disponible
            description = "No s'ha pogut connectar amb el model d'IA. Descripció no disponible.";
            tags = ['error', 'sense-model'];
        }

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

        // Guardar la respuesta en la BD
        const responseRecord = await Response.create({
            requestId: analysisRequest.id,
            description: description,
            tags: JSON.stringify(tags),
            model_used: ollamaModel,
            processing_time: processingTime
        });

        return res.json(createResponse('OK', 'Imatge processada correctament', {
            description: description,
            tags: tags,
            processing_time: processingTime,
            model_used: ollamaModel
        }));

    } catch (error) {
        console.error('Error al processar imatge:', error);
        return res.status(500).json(createResponse('ERROR', 'Error al processar imatge'));
    }
});

// POST /api/analitzar-imatge-test
// Endpoint de prueba que siempre retorna datos mock (SIN autenticación)
router.post('/analitzar-imatge-test', async (req, res) => {
    try {
        const { image } = req.body;

        // Log para verificar que llegan datos
        console.log(`[TEST] Imatge rebuda: ${image ? image.substring(0, 50) + '...' : 'cap'} (${image ? image.length : 0} chars)`);

        return res.json(createResponse('OK', 'Imatge de test processada', {
            description: "Aquesta és una descripció de test. La imatge mostra un objecte de prova per validar la funcionalitat de l'aplicació mòbil.",
            tags: ["test", "prova", "validació", "mock"],
            processing_time: "0.1s",
            model_used: "test-model-v1"
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al processar imatge de test'));
    }
});

// --- Endpoint de Estadísticas de Tags (Desktop) ---

// GET /api/admin/estadistiques/tags
// Retorna recuento agregado de todos los tags almacenados
router.get('/admin/estadistiques/tags', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json(createResponse('ERROR', 'Accés denegat'));
    }

    try {
        // Obtener todas las respuestas con tags
        const responses = await Response.findAll({
            attributes: ['tags'],
            where: {
                tags: { [Op.not]: null }
            }
        });

        // Agregar conteo de tags
        const tagCounts = {};
        responses.forEach(resp => {
            try {
                const tags = JSON.parse(resp.tags);
                if (Array.isArray(tags)) {
                    tags.forEach(tag => {
                        const normalizedTag = tag.toLowerCase().trim();
                        if (normalizedTag) {
                            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                        }
                    });
                }
            } catch (e) {
                // Si tags no es JSON válido, intentar separar por comas
                const tags = resp.tags.split(',');
                tags.forEach(tag => {
                    const normalizedTag = tag.toLowerCase().trim();
                    if (normalizedTag) {
                        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                    }
                });
            }
        });

        // Convertir a array ordenado por conteo
        const sortedTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);

        return res.json(createResponse('OK', 'Estadístiques obtingudes', {
            totalTags: sortedTags.length,
            totalAnalysis: responses.length,
            tags: sortedTags
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', "Error al obtenir estadístiques"));
    }
});

module.exports = router;
