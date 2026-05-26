const firebaseConfig = {
  apiKey: "AIzaSyDOXhnHyCnrdyXW6sBBgEDpjmi0u8jieXU",
  authDomain: "my-chat-aff19.firebaseapp.com",
  databaseURL: "https://meu-chat-aff19-default-rtdb.firebaseio.com",
  projectId: "meu-chat-aff19",
  storageBucket: "meu-chat-aff19.firebasestorage.app",
  messagingSenderId: "710560450350",
  appId: "1:710560450350:web:ac43f97433bd648b571cbf",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elementos
const loginSection = document.getElementById("login-section");
const chatSection = document.getElementById("chat-section");
const loginForm = document.getElementById("login-form");
const chatForm = document.getElementById("chat-form");
const messagesContainer = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const authTitle = document.getElementById("auth-title");
const btnAuth = document.getElementById("btn-auth");

const btnSettingsOpen = document.getElementById("btn-settings-open");
const btnSettingsClose = document.getElementById("btn-settings-close");
const settingsModal = document.getElementById("settings-modal");
const themeSelect = document.getElementById("theme-select");

const tabGroups = document.getElementById("tab-groups");
const tabDms = document.getElementById("tab-dms");
const listContainer = document.getElementById("list-container");
const currentChatTitle = document.getElementById("current-chat-title");

// Novos Elementos de Gerenciamento de Conta
const newPasswordInput = document.getElementById("new-password-input");
const btnChangePassword = document.getElementById("btn-change-password");
const btnDeleteAccount = document.getElementById("btn-delete-account");

let user = { name: "", color: "", uid: "" };
let activeTab = "groups";
let currentTargetId = "";
const colors = ["#e67e22", "#2ecc71", "#3498db", "#9b59b6", "#f1c40f", "#e74c3c"];

// --- CONTROLE DE TEMA ---
function carregarTemaSalvo() {
    const temaSalvo = localStorage.getItem("zapchat-theme") || "dark";
    themeSelect.value = temaSalvo;
    if (temaSalvo === "light") document.body.classList.add("light-theme");
    else document.body.classList.remove("light-theme");
}

themeSelect.addEventListener("change", (e) => {
    const temaEscolhido = e.target.value;
    localStorage.setItem("zapchat-theme", temaEscolhido);
    if (temaEscolhido === "light") document.body.classList.add("light-theme");
    else document.body.classList.remove("light-theme");
});

btnSettingsOpen.addEventListener("click", () => settingsModal.style.display = "flex");
btnSettingsClose.addEventListener("click", () => settingsModal.style.display = "none");

// --- RECURSOS DO USUÁRIO (MUDAR SENHA / DELETAR CONTA) ---
btnChangePassword.addEventListener("click", async () => {
    const novaSenha = newPasswordInput.value;
    if (novaSenha.length < 6) {
        alert("A nova senha deve conter no mínimo 6 caracteres!");
        return;
    }
    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            await currentUser.updatePassword(novaSenha);
            alert("Senha atualizada com sucesso!");
            newPasswordInput.value = "";
        }
    } catch (error) {
        alert("Erro ao atualizar senha. Se logue novamente e tente outra vez: " + error.message);
    }
});

btnDeleteAccount.addEventListener("click", async () => {
    const confirmar = confirm("ATENÇÃO:\nVocê tem certeza absoluta que deseja excluir sua conta permanentemente?\nEsta ação não poderá ser desfeita!");
    if (!confirmar) return;

    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const nóUsuario = gerarChaveUsuario(user.name);
            
            // Remove o registro do Banco de Dados Primeiro
            await database.ref(`usuarios_registrados/${nóUsuario}`).remove();
            
            // Deleta o registro de Autenticação
            await currentUser.delete();
            
            alert("Sua conta foi excluída com sucesso.");
            window.location.reload();
        }
    } catch (error) {
        alert("Erro de segurança. É necessário fazer login novamente antes de poder deletar a conta: " + error.message);
    }
});

// --- INTERRUPTOR LOGIN / CADASTRO ---
tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    authTitle.innerText = "Entrar no ZapChat";
    btnAuth.innerText = "Entrar";
});
tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    authTitle.innerText = "Criar Conta no ZapChat";
    btnAuth.innerText = "Cadastrar";
});

function gerarChaveUsuario(nome) {
    return btoa(unescape(encodeURIComponent(nome.trim().toLowerCase()))).replace(/=/g, "");
}

// --- AUTENTICAÇÃO ---
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const originalUsername = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value;
    const modoAtual = tabLogin.classList.contains("active") ? "login" : "cadastro";
    
    if (!originalUsername || passwordInput.length < 6) {
        alert("A senha precisa ter no mínimo 6 dígitos.");
        return;
    }

    btnAuth.disabled = true;
    const nóUsuario = gerarChaveUsuario(originalUsername);
    const emailMascarado = `${nóUsuario}@zapchat.com`;

    if (modoAtual === "cadastro") {
        try {
            const nameCheck = await database.ref(`usuarios_registrados/${nóUsuario}`).get();
            if (nameCheck.exists()) {
                alert("Este nome de usuário já está em uso!");
                btnAuth.disabled = false;
                return;
            }
            const userCredential = await auth.createUserWithEmailAndPassword(emailMascarado, passwordInput);
            const corSorteada = colors[Math.floor(Math.random() * colors.length)];

            await database.ref(`usuarios_registrados/${nóUsuario}`).set({
                uid: userCredential.user.uid,
                displayName: originalUsername,
                color: corSorteada
            });

            alert("Conta criada com sucesso!");
            user.uid = userCredential.user.uid;
            iniciarChatApp(originalUsername, corSorteada);
        } catch (error) {
            alert("Erro ao cadastrar: " + error.message);
            btnAuth.disabled = false;
        }
    } else {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(emailMascarado, passwordInput);
            user.uid = userCredential.user.uid;
            const snapshot = await database.ref(`usuarios_registrados/${nóUsuario}`).get();
            if (snapshot.exists()) {
                const dados = snapshot.val();
                iniciarChatApp(dados.displayName, dados.color);
            } else {
                iniciarChatApp(originalUsername, colors[0]);
            }
        } catch (error) {
            alert("Usuário ou senha incorretos!");
            btnAuth.disabled = false;
        }
    }
});

function iniciarChatApp(nome, cor) {
    user.name = nome;
    user.color = cor;
    loginSection.style.display = "none";
    chatSection.style.display = "flex";
    
    renderizarLista();
}

// --- ALTERNADOR DE ABAS ---
tabGroups.addEventListener("click", () => {
    activeTab = "groups";
    tabGroups.classList.add("active");
    tabDms.classList.remove("active");
    renderizarLista();
});

tabDms.addEventListener("click", () => {
    activeTab = "dms";
    tabDms.classList.add("active");
    tabGroups.classList.remove("active");
    renderizarLista();
});

// --- RENDERIZAR BARRA LATERAL ---
function renderizarLista() {
    listContainer.innerHTML = "";
    
    if (activeTab === "groups") {
        const item = document.createElement("div");
        item.classList.add("sidebar-item");
        item.innerText = "💬 Grupo Geral";
        item.onclick = () => abrirConversa("grupo_geral", "Grupo Geral", "grupos/grupo_geral");
        listContainer.appendChild(item);
    } else {
        database.ref("usuarios_registrados").once("value", (snapshot) => {
            snapshot.forEach((child) => {
                const dados = child.val();
                if (dados.uid !== user.uid) {
                    const item = document.createElement("div");
                    item.classList.add("sidebar-item");
                    item.innerText = `👤 ${dados.displayName}`;
                    
                    const chatId = user.uid < dados.uid ? `${user.uid}_${dados.uid}` : `${dados.uid}_${user.uid}`;
                    item.onclick = () => abrirConversa(chatId, dados.displayName, `dms/${chatId}`);
                    listContainer.appendChild(item);
                }
            });
        });
    }
}

// --- GERENCIAMENTO DA CONVERSA ATIVA ---
let dbRefAtual = null;

function abrirConversa(id, titulo, caminhoFirebase) {
    currentTargetId = id;
    currentChatTitle.innerText = titulo;
    messagesContainer.innerHTML = "";
    chatForm.style.display = "flex";
    
    if (dbRefAtual) dbRefAtual.off();

    dbRefAtual = database.ref(caminhoFirebase);
    dbRefAtual.orderByChild("timestamp").on("child_added", (snap) => {
        displayMessage(snap.val());
    });
}

// --- EXIBIÇÃO E ENVIO DE TEXTO ---
const displayMessage = (data) => {
    const div = document.createElement("div");
    div.classList.add("msg");
    div.classList.add(data.sender === user.name ? "msg-self" : "msg-other");
    
    const divConteudo = document.createElement("div");
    divConteudo.innerText = data.message;
    
    div.innerHTML = `<span class="sender" style="color: ${data.color}">${data.sender}</span>`;
    div.appendChild(divConteudo);
    
    messagesContainer.appendChild(div);
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight);
};

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = chatInput.value.trim();
    if (!texto || !dbRefAtual) return;

    dbRefAtual.push({
        sender: user.name,
        color: user.color,
        message: texto,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    chatInput.value = "";
    chatInput.focus();
});

carregarTemaSalvo();