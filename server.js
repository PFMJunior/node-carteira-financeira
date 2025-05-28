require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors()); // Habilita o CORS para permitir requisições do frontend
app.use(express.json()); // Permite que o Express parseie JSON no corpo das requisições

// Função para ler usuários do arquivo JSON
const readUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, JSON.stringify([]));
        }
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler o arquivo de usuários:', error);
        return [];
    }
};

// Função para escrever usuários no arquivo JSON
const writeUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Erro ao escrever no arquivo de usuários:', error);
    }
};

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user; // Adiciona o usuário decodificado à requisição
        next();
    });
};

// Rota de Cadastro
app.post('/register', async (req, res) => {
    const { username, password, fullName, cpf, birthDate } = req.body;

    if (!username || !password || !fullName || !cpf || !birthDate) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    const users = readUsers();
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
        writeUsers(users);
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId: newUser.id });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao cadastrar usuário.' });
    }
});

// Rota de Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    try {
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login realizado com sucesso!', token: token });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

// Exemplo de rota protegida (requer autenticação)
app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Bem-vindo, ${req.user.username}! Esta é uma rota protegida.` });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});