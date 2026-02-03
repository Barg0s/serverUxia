const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let ADMIN_TOKEN = '';
let USER_API_KEY = '';

async function testApi() {
    try {
        console.log('--- TEST START ---');

        // 1. Admin Login
        console.log('\n[TEST] Admin Login');
        try {
            const res = await axios.post(`${BASE_URL}/admin/usuaris/login`, {
                email: 'admin@example.com',
                password: 'password'
            });
            console.log('PASS:', res.data.message);
            ADMIN_TOKEN = res.data.data.token;
        } catch (e) {
            console.error('FAIL:', e.response?.data || e.message);
        }

        // 2. User Registration
        console.log('\n[TEST] User Registration');
        const phone = '+34600000000';
        try {
            const res = await axios.post(`${BASE_URL}/usuaris/registrar`, {
                nickname: 'TestUser',
                email: 'test@example.com',
                telefon: phone
            });
            console.log('PASS:', res.data.message);
        } catch (e) {
            if (e.response && e.response.status === 400 && e.response.data.message === 'Usuari ja existent') {
                console.log('PASS (User already exists)');
            } else {
                console.error('FAIL:', e.response?.data || e.message);
            }
        }

        // 3. User Validation
        console.log('\n[TEST] User Validation');
        try {
            const res = await axios.post(`${BASE_URL}/usuaris/validar`, {
                telefon: phone,
                codi_validacio: 123456
            });
            console.log('PASS:', res.data.message);
            USER_API_KEY = res.data.data.api_key;
        } catch (e) {
            console.error('FAIL:', e.response?.data || e.message);
        }

        // 4. User Profile
        console.log('\n[TEST] User Profile');
        try {
            const res = await axios.get(`${BASE_URL}/usuaris/perfil`, {
                headers: { Authorization: `Bearer ${USER_API_KEY}` }
            });
            console.log('PASS:', res.data.data.nickname);
        } catch (e) {
            console.error('FAIL:', e.response?.data || e.message);
        }

        // 5. Admin List Users
        console.log('\n[TEST] Admin List Users');
        try {
            const res = await axios.get(`${BASE_URL}/admin/usuaris`, {
                headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
            });
            console.log('PASS: Retrieved', res.data.data.length, 'users');
        } catch (e) {
            console.error('FAIL:', e.response?.data || e.message);
        }

        // 6. Image Analysis
        console.log('\n[TEST] Image Analysis');
        try {
            const res = await axios.post(`${BASE_URL}/analitzar-imatge`, {
                model: 'qwen2.5vl:7b',
                prompt: 'Describe',
                images: ['base64...'],
                stream: false
            }, {
                headers: { Authorization: `Bearer ${USER_API_KEY}` }
            });
            console.log('PASS:', res.data.data.description);
        } catch (e) {
            console.error('FAIL:', e.response?.data || e.message);
        }

    } catch (error) {
        console.error('Global Error:', error);
    }
}

testApi();
