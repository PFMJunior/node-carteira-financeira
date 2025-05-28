const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const jwtConfig = require('../config/jwt');

const router = express.Router();

// Rota de Cadastro
router.post('/register', async (req, res) => {
    const { username, password, fullName, cpf, birthDate } = req.body;

    if (!username || !password || !fullName || !cpf || !birthDate) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios para o cadastro.' });
    }

    const users = userModel.readUsers();
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        return res.status(409).json({ message: 'Nome de usuário já existe.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(),
            username,
            password: hashedPassword,
            fullName,
            cpf,
            birthDate
        };
        users.push(newUser);
        userModel.writeUsers(users);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId: newUser.id });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao cadastrar usuário.' });
    }
});

// Rota de Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    const users = userModel.readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    try {
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
        res.status(200).json({ message: 'Login realizado com sucesso!', token: token });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

module.exports = router;