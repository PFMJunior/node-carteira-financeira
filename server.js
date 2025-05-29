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

// Função para gerar um número de conta único de até 4 dígitos
const generateAccountNumber = (users) => {
    let accountNumber;
    let isUnique = false;
    while (!isUnique) {
        accountNumber = Math.floor(1000 + Math.random() * 9000); // Gera um número entre 1000 e 9999
        isUnique = !users.some(u => u.accountNumber === accountNumber);
    }
    return accountNumber;
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
        return res.status(400).json({ message: 'Nome de usuário, senha, nome completo, CPF e data de nascimento são obrigatórios.' });
    }

    const users = readUsers();
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        return res.status(409).json({ message: 'Nome de usuário já existe.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(), // Usar Date.now() para um ID simples
            username,
            password: hashedPassword,
            fullName,
            cpf,
            birthDate,
            balance: 0.00, // Novo campo: saldo inicial do usuário
            accountNumber: generateAccountNumber(users) // Novo campo: número da conta
        };
        users.push(newUser);
        writeUsers(users);
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            userId: newUser.id,
            accountNumber: newUser.accountNumber
        });
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

// Rota de Depósito
app.post('/deposit', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id; // Pega o ID do usuário logado

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Um valor de depósito válido é obrigatório.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Atualiza o saldo do usuário
    users[userIndex].balance = parseFloat(users[userIndex].balance) + parseFloat(amount);
    writeUsers(users);

    res.status(200).json({
        message: `Depósito de R$${amount.toFixed(2)} realizado com sucesso para ${users[userIndex].username}.`,
        newBalance: users[userIndex].balance.toFixed(2)
    });
});

// Rota de Transferencia
app.post('/transfer', authenticateToken, (req, res) => {
    const { recipientAccountNumber, amount } = req.body;
    const senderId = req.user.id; // ID do usuário que está enviando

    if (!recipientAccountNumber || !amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Número da conta do destinatário e um valor de transferência válido são obrigatórios.' });
    }

    const users = readUsers();
    const senderIndex = users.findIndex(u => u.id === senderId);
    const recipientIndex = users.findIndex(u => u.accountNumber === recipientAccountNumber);

    if (senderIndex === -1) {
        return res.status(404).json({ message: 'Usuário remetente não encontrado.' });
    }

    if (recipientIndex === -1) {
        return res.status(404).json({ message: 'Número da conta do destinatário não encontrado.' });
    }

    if (senderId === users[recipientIndex].id) {
        return res.status(400).json({ message: 'Você não pode transferir para sua própria conta.' });
    }

    const senderBalance = parseFloat(users[senderIndex].balance);
    const transferAmount = parseFloat(amount);

    if (senderBalance < transferAmount) {
        return res.status(400).json({ message: 'Saldo insuficiente para a transferência.' });
    }

    // Realiza a transferência
    users[senderIndex].balance = senderBalance - transferAmount;
    users[recipientIndex].balance = parseFloat(users[recipientIndex].balance) + transferAmount;

    writeUsers(users);

    res.status(200).json({
        message: `Transferência de R$${transferAmount.toFixed(2)} para a conta ${recipientAccountNumber} realizada com sucesso.`,
        yourNewBalance: users[senderIndex].balance.toFixed(2)
    });
});

// Rota para obter os dados completos do usuário logado
app.get('/user-data', authenticateToken, (req, res) => {
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);

    if (!currentUser) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Retorna todos os dados do usuário, exceto a senha
    const { password, ...userData } = currentUser; // Remove a senha do objeto
    res.status(200).json({ user: userData });
});

// Exemplo de rota protegida (requer autenticação)
app.get('/protected', authenticateToken, (req, res) => {
    const users = readUsers();
    const currentUser = users.find(u => u.id === req.user.id);

    if (!currentUser) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.status(200).json({
        message: `Bem-vindo, ${req.user.username}! Esta é uma rota protegida.`,
        yourBalance: currentUser.balance.toFixed(2), // Exibe o saldo do usuário logado
        yourAccountNumber: currentUser.accountNumber
    });
});


// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});