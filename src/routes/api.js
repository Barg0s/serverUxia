const express = require('express');
const router = express.Router();
const { User, AnalysisRequest, Response } = require('../models');
const { createResponse } = require('../utils/response');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

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

// GET /api/admin/usuaris
// Listado de todos los usuarios (Solo para admins)
router.get('/admin/usuaris', authMiddleware, async (req, res) => {
    // Verificar rol de administrador
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

// --- Endpoint de Análisis de Imagen ---

// POST /api/analitzar-imatge
// Recibe una imagen y devuelve una descripción (Simulado)
router.post('/analitzar-imatge', authMiddleware, async (req, res) => {
    try {
        const { model, prompt, images, stream } = req.body;

        // Aquí podríamos guardar la petición en la tabla AnalysisRequest
        // const request = await AnalysisRequest.create({ userId: req.user.id, ... });

        // Respuesta simulada de la IA
        return res.json(createResponse('OK', 'Imatges processades correctament', {
            description: "La imatge mostra un personatge pixelat (Exemple de resposta IA)...",
            tags: ["pixel", "videojoc", "retro"],
            processing_time: "2.3s",
            model_used: model || "qwen2.5vl:7b"
        }));

    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error al processar imatge'));
    }
});

module.exports = router;
