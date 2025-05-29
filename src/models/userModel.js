const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../users.json'); // Ajuste o caminho conforme a estrutura

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

module.exports = {
    readUsers,
    writeUsers,
    generateAccountNumber
};