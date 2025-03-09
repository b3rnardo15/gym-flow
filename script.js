// ====== Configurações e Variáveis Globais ======
let listaExercicios = [];
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let conquistas = JSON.parse(localStorage.getItem('conquistas')) || {
    primeiroTreino: false,
    cincoDiasSeguidos: false,
    dezExercicios: false,
    trintaDiasSeguidos: false,
    carregamentoPesado: false
};
let timerInterval;
let tempoRestante = 0;
let modoEscuro = localStorage.getItem('modoEscuro') === 'true';

// Ícones para categorias de exercícios
const iconesCategoria = {
    'Peito': 'chest.jpg',
    'Perna': 'leg.jpg',
    'Ombros': 'shoulder.jpg',
    'Costas': 'back.jpg',
    'Bíceps': 'biceps.jpg',
    'Antebraço': 'forearm.jpg',
    'Tríceps': 'triceps.jpg',
    'Abdômen': 'abs.jpg',
    'Cardio': 'cardio.jpg'
};

// ====== Inicialização ======
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar tema salvo
    if (modoEscuro) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }

    // Adicionar botão de alternar tema
    const header = document.querySelector('header');
    if (header) {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'mode-toggle';
        themeToggle.innerHTML = modoEscuro ? '☀️' : '🌙';
        themeToggle.onclick = toggleModoEscuro;
        header.appendChild(themeToggle);
    }

    // Verificar a página atual e inicializar conforme necessário
    const currentPath = window.location.pathname;
    
    if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
        renderizarExercicios();
        verificarConquistas();
    } else if (currentPath.includes('treino.html')) {
        document.getElementById('treinoForm').addEventListener('submit', adicionarExercicio);
        document.getElementById('salvarTreino').addEventListener('click', salvarTreino);
        carregarExerciciosSalvos();
        
        // Adicionar timer de descanso
        const timerContainer = document.createElement('div');
        timerContainer.className = 'rest-timer mb-4';
        timerContainer.innerHTML = `
            <h3>Timer de Descanso</h3>
            <div class="timer-display" id="timerDisplay">00:00</div>
            <div class="timer-controls">
                <button class="btn btn-outline-primary" onclick="iniciarTimer(30)">30s</button>
                <button class="btn btn-outline-primary" onclick="iniciarTimer(60)">1m</button>
                <button class="btn btn-outline-primary" onclick="iniciarTimer(90)">1m30s</button>
                <button class="btn btn-outline-primary" onclick="iniciarTimer(120)">2m</button>
                <button class="btn btn-danger" onclick="pararTimer()">Parar</button>
            </div>`;
        
        // Inserir timer após o formulário
        const form = document.getElementById('treinoForm');
        form.parentNode.insertBefore(timerContainer, form.nextSibling);
    } else if (currentPath.includes('desempenho.html')) {
        renderizarGrafico();
        renderizarHistorico();
        renderizarConquistas();
        
        // Adicionar botões de importar/exportar
        const container = document.querySelector('.container');
        if (container) {
            const botoesBackup = document.createElement('div');
            botoesBackup.className = 'backup-buttons mt-4';
            botoesBackup.innerHTML = `
                <h3>Backup e Restauração</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary" onclick="exportarDados()">Exportar Dados</button>
                    <div class="upload-btn-wrapper">
                        <button class="btn btn-secondary">Importar Dados</button>
                        <input type="file" accept=".json" onchange="importarDados(event)" />
                    </div>
                </div>
            `;
            container.appendChild(botoesBackup);
        }
    }
});

// ====== Funções de Tema ======
function toggleModoEscuro() {
    modoEscuro = !modoEscuro;
    localStorage.setItem('modoEscuro', modoEscuro);
    
    if (modoEscuro) {
        document.body.setAttribute('data-theme', 'dark');
        document.querySelector('.mode-toggle').innerHTML = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        document.querySelector('.mode-toggle').innerHTML = '🌙';
    }
}

// ====== Funções de Exercícios ======
function adicionarExercicio(event) {
    if (event) event.preventDefault();
    
    const nome = document.getElementById('nomeExercicio').value.trim();
    const repeticoes = document.getElementById('repeticoes').value;
    const carga = document.getElementById('kgs').value;
    const series = document.getElementById('series').value;
    const categoria = document.getElementById('categoria').value;

    if (!nome || repeticoes <= 0 || carga < 0 || series <= 0) {
        alert("Por favor, preencha todos os campos corretamente!");
        return;
    }

    const novoExercicio = { 
        nome, 
        repeticoes, 
        carga, 
        series, 
        categoria,
        data: new Date().toISOString(),
        concluido: false
    };
    
    listaExercicios.push(novoExercicio);
    document.getElementById('treinoForm').reset();
    renderizarListaExercicios();
}

function renderizarExercicios() {
    const cardsTreinos = document.getElementById('cardsTreinos');
    if (!cardsTreinos) return;
    
    cardsTreinos.innerHTML = '';
    
    // Carregar exercícios do localStorage
    const exercicios = JSON.parse(localStorage.getItem('exercicios')) || [];
    
    // Agrupar por categoria
    const categorias = {};
    exercicios.forEach(exercicio => {
        if (!categorias[exercicio.categoria]) {
            categorias[exercicio.categoria] = [];
        }
        categorias[exercicio.categoria].push(exercicio);
    });
    
    // Se não houver exercícios, mostrar mensagem
    if (Object.keys(categorias).length === 0) {
        cardsTreinos.innerHTML = `
            <div class="col-12 text-center">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Nenhum treino cadastrado</h5>
                        <p>Adicione seu primeiro treino clicando no botão "Adicionar Treino".</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Criar cards para cada categoria
    for (const categoria in categorias) {
        const cardCategoria = document.createElement('div');
        cardCategoria.classList.add('col-md-4', 'mb-3');
        
        // Calcular progresso (% de exercícios concluídos)
        const totalExercicios = categorias[categoria].length;
        const concluidos = categorias[categoria].filter(ex => ex.concluido).length;
        const porcentagemConcluida = totalExercicios > 0 ? (concluidos / totalExercicios) * 100 : 0;
        
        // Selecionar ícone da categoria
        const iconeCategoria = iconesCategoria[categoria] || 'default.jpg';
        
        const cardContent = `
            <div class="card category-card">
                <div class="card-body">
                    <h5 class="card-title">
                        <img src="./icons/${iconeCategoria}" alt="${categoria}" class="category-icon" onerror="this.onerror=null; this.src='./icons/default.jpg';">
                        ${categoria}
                    </h5>
                    <div class="progress mb-3">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${porcentagemConcluida}%" 
                             aria-valuenow="${porcentagemConcluida}" aria-valuemin="0" aria-valuemax="100">
                            ${Math.round(porcentagemConcluida)}%
                        </div>
                    </div>
                    <ul class="list-group" style="display: none;">
                        ${categorias[categoria].map(exercicio => `
                            <li class="list-group-item">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" 
                                        ${exercicio.concluido ? 'checked' : ''} 
                                        onchange="marcarConcluido('${exercicio.nome}', '${exercicio.categoria}', this.checked)">
                                    <label class="form-check-label">
                                        <h6>${exercicio.nome}</h6>
                                        <p>Repetições: ${exercicio.repeticoes}</p>
                                        <p>Carga: ${exercicio.carga}kg</p>
                                        <p>Séries: ${exercicio.series}</p>
                                    </label>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                    <button class="btn btn-info w-100" onclick="toggleListaExercicios(this)">Ver Exercícios</button>
                </div>
            </div>
        `;
        
        cardCategoria.innerHTML = cardContent;
        cardsTreinos.appendChild(cardCategoria);
    }
}

function toggleListaExercicios(button) {
    const listGroup = button.previousElementSibling;
    const displayAtual = listGroup.style.display;
    
    if (displayAtual === 'none' || displayAtual === '') {
        listGroup.style.display = 'block';
        button.textContent = 'Ocultar Exercícios';
    } else {
        listGroup.style.display = 'none';
        button.textContent = 'Ver Exercícios';
    }
}

function marcarConcluido(nome, categoria, concluido) {
    const exercicios = JSON.parse(localStorage.getItem('exercicios')) || [];
    
    // Encontrar e atualizar o exercício
    const exercicio = exercicios.find(ex => ex.nome === nome && ex.categoria === categoria);
    if (exercicio) {
        exercicio.concluido = concluido;
        
        // Se concluído, registrar no histórico
        if (concluido) {
            adicionarAoHistorico(exercicio);
        }
        
        localStorage.setItem('exercicios', JSON.stringify(exercicios));
        verificarConquistas();
    }
}

function carregarExerciciosSalvos() {
    listaExercicios = JSON.parse(localStorage.getItem('exercicios')) || [];
    renderizarListaExercicios();
}

function renderizarListaExercicios() {
    const lista = document.getElementById('listaExercicios');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    const categorias = {};
    listaExercicios.forEach(exercicio => {
        if (!categorias[exercicio.categoria]) {
            categorias[exercicio.categoria] = [];
        }
        categorias[exercicio.categoria].push(exercicio);
    });

    for (const categoria in categorias) {
        const card = document.createElement('div');
        card.classList.add('card', 'mb-3');
        card.innerHTML = `
            <div class="card-header bg-info text-white d-flex justify-content-between">
                <span>${categoria}</span>
                <button class="btn btn-sm btn-danger" onclick="removerCategoria('${categoria}')">Remover</button>
            </div>
            <ul class="list-group list-group-flush">
                ${categorias[categoria].map((ex, index) => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><strong>${ex.nome}</strong> - ${ex.series}x${ex.repeticoes} (${ex.carga}kg)</span>
                        <button class="btn btn-sm btn-danger" onclick="removerExercicio('${categoria}', ${index})">X</button>
                    </li>
                `).join('')}
            </ul>
        `;
        lista.appendChild(card);
    }
}

function removerExercicio(categoria, index) {
    const exerciciosCategoria = listaExercicios.filter(ex => ex.categoria === categoria);
    const exercicio = exerciciosCategoria[index];
    listaExercicios = listaExercicios.filter(ex => ex !== exercicio);
    renderizarListaExercicios();
}

function removerCategoria(categoria) {
    listaExercicios = listaExercicios.filter(ex => ex.categoria !== categoria);
    renderizarListaExercicios();
}

function salvarTreino() {
    // Combinar com exercícios existentes
    const exerciciosExistentes = JSON.parse(localStorage.getItem('exercicios')) || [];
    const todosExercicios = [...exerciciosExistentes, ...listaExercicios];
    
    localStorage.setItem('exercicios', JSON.stringify(todosExercicios));
    
    // Registrar data do treino no histórico
    if (listaExercicios.length > 0) {
        const dataAtual = new Date().toISOString().split('T')[0];
        adicionarDataTreino(dataAtual);
        verificarConquistas();
    }
    
    alert("Treino salvo com sucesso!");
    window.location.href = 'index.html';
}

// ====== Funções de Timer ======
function iniciarTimer(segundos) {
    // Parar timer anterior se existir
    pararTimer();
    
    tempoRestante = segundos;
    atualizarDisplayTimer();
    
    // Iniciar contador
    timerInterval = setInterval(() => {
        tempoRestante--;
        atualizarDisplayTimer();
        
        if (tempoRestante <= 0) {
            pararTimer();
            notificarFimTimer();
        }
    }, 1000);
}

function pararTimer() {
    clearInterval(timerInterval);
}

function atualizarDisplayTimer() {
    const minutos = Math.floor(tempoRestante / 60);
    const segundos = tempoRestante % 60;
    
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }
}

function notificarFimTimer() {
    // Tocar som de alarme (opcional)
    const audio = new Audio('./sounds/beep.mp3');
    audio.play().catch(e => console.log('Erro ao tocar som:', e));
    
    // Notificação visual
    alert('Tempo de descanso finalizado!');
}

// ====== Funções de Gráfico e Análise ======
function renderizarGrafico() {
    const graficoContainer = document.getElementById('graficoExercicios');
    if (!graficoContainer) return;
    
    const exercicios = JSON.parse(localStorage.getItem('exercicios')) || [];
    
    // Processar dados para o gráfico
    const dados = processarDadosGrafico(exercicios);
    
    // Configurar o gráfico de barras
    const ctx = graficoContainer.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.labels,
            datasets: [
                {
                    label: 'Total de Séries',
                    data: dados.series,
                    backgroundColor: 'rgba(40, 167, 69, 0.5)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Carga Total (kg)',
                    data: dados.cargas,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total de Repetições',
                    data: dados.repeticoes,
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Desempenho por Categoria'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.raw;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
    
    // Adicionar gráfico de progresso (linha) com datas
    adicionarGraficoProgresso();
}

function processarDadosGrafico(exercicios) {
    const categorias = {};
    const resultado = {
        labels: [],
        series: [],
        cargas: [],
        repeticoes: []
    };
    
    exercicios.forEach(exercicio => {
        if (!categorias[exercicio.categoria]) {
            categorias[exercicio.categoria] = {
                series: 0,
                carga: 0,
                repeticoes: 0
            };
            resultado.labels.push(exercicio.categoria);
        }
        
        categorias[exercicio.categoria].series += parseInt(exercicio.series);
        categorias[exercicio.categoria].carga += parseInt(exercicio.carga) * parseInt(exercicio.series) * parseInt(exercicio.repeticoes);
        categorias[exercicio.categoria].repeticoes += parseInt(exercicio.repeticoes) * parseInt(exercicio.series);
    });
    
    resultado.labels.forEach(categoria => {
        resultado.series.push(categorias[categoria].series);
        resultado.cargas.push(categorias[categoria].carga);
        resultado.repeticoes.push(categorias[categoria].repeticoes);
    });
    
    return resultado;
}

function adicionarGraficoProgresso() {
    // Criar container para o gráfico se não existir
    let container = document.querySelector('.progress-chart');
    if (!container) {
        container = document.createElement('div');
        container.className = 'progress-chart';
        container.innerHTML = `
            <h3>Progresso ao Longo do Tempo</h3>
            <canvas id="graficoProgresso"></canvas>
        `;
        
        const desempenhoContainer = document.querySelector('.container');
        if (desempenhoContainer) {
            desempenhoContainer.appendChild(container);
        }
    }
    
    // Obter datas de treino do histórico
    const datas = obterDatasHistorico();
    
    // Criar dados para o gráfico
    const dadosProgresso = processarDadosProgresso(datas);
    
   // Renderizar gráfico
    const ctx = document.getElementById('graficoProgresso').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dadosProgresso.labels,
            datasets: [{
                label: 'Treinos por Semana',
                data: dadosProgresso.valores,
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Frequência de Treinos'
                }
            }
        }
    });
}

function processarDadosProgresso(datas) {
    // Ordenar datas
    datas.sort();
    
    // Agrupar por semana
    const semanas = {};
    datas.forEach(data => {
        const dataObj = new Date(data);
        const semana = getWeekNumber(dataObj);
        const ano = dataObj.getFullYear();
        const chave = `${ano}-W${semana}`;
        
        if (!semanas[chave]) {
            semanas[chave] = 0;
        }
        semanas[chave]++;
    });
    
    // Criar arrays para o gráfico
    const labels = [];
    const valores = [];
    
    for (const semana in semanas) {
        labels.push(semana);
        valores.push(semanas[semana]);
    }
    
    return { labels, valores };
}

// Função auxiliar para obter o número da semana
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function obterDatasHistorico() {
    const datas = [];
    historico.forEach(item => {
        if (item.tipo === 'treino') {
            datas.push(item.data);
        }
    });
    return datas;
}

// ====== Funções de Histórico ======
function adicionarAoHistorico(exercicio) {
    historico.push({
        tipo: 'exercicio',
        nome: exercicio.nome,
        categoria: exercicio.categoria,
        carga: exercicio.carga,
        repeticoes: exercicio.repeticoes,
        series: exercicio.series,
        data: new Date().toISOString()
    });
    
    localStorage.setItem('historico', JSON.stringify(historico));
}

function adicionarDataTreino(data) {
    // Verificar se já tem registro desta data
    const jaRegistrado = historico.some(item => 
        item.tipo === 'treino' && item.data.split('T')[0] === data
    );
    
    if (!jaRegistrado) {
        historico.push({
            tipo: 'treino',
            data: data
        });
        
        localStorage.setItem('historico', JSON.stringify(historico));
    }
}

function renderizarHistorico() {
    const historicoContainer = document.getElementById('historicoTreinos');
    if (!historicoContainer) return;
    
    // Filtrar apenas registros de treinos completos
    const treinosDatas = historico.filter(item => item.tipo === 'treino')
        .map(item => item.data.split('T')[0]);
    
    // Ordenar por data (mais recente primeiro)
    treinosDatas.sort((a, b) => new Date(b) - new Date(a));
    
    // Limitar a 30 últimos dias
    const ultimosTreinos = treinosDatas.slice(0, 30);
    
    // Calcular sequência atual
    const sequenciaAtual = calcularSequenciaAtual(treinosDatas);
    
    // Renderizar calendário
    historicoContainer.innerHTML = `
        <h3>Últimos Treinos</h3>
        <p>Sequência atual: ${sequenciaAtual} dia(s)</p>
        <div class="calendario-treinos">
            ${ultimosTreinos.map(data => {
                const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
                return `<div class="dia-treino">${dataFormatada}</div>`;
            }).join('')}
        </div>
    `;
}

function calcularSequenciaAtual(datas) {
    if (datas.length === 0) return 0;
    
    // Verificar se hoje tem treino
    const hoje = new Date().toISOString().split('T')[0];
    const temTreinoHoje = datas.includes(hoje);
    
    if (!temTreinoHoje) return 0;
    
    // Contar dias consecutivos
    let sequencia = 1;
    let dataAtual = new Date(hoje);
    
    while (sequencia < datas.length) {
        dataAtual.setDate(dataAtual.getDate() - 1);
        const dataAnterior = dataAtual.toISOString().split('T')[0];
        
        if (datas.includes(dataAnterior)) {
            sequencia++;
        } else {
            break;
        }
    }
    
    return sequencia;
}

// ====== Funções de Conquistas ======
function verificarConquistas() {
    const exercicios = JSON.parse(localStorage.getItem('exercicios')) || [];
    
    // Verificar primeiro treino
    if (!conquistas.primeiroTreino && exercicios.length > 0) {
        conquistas.primeiroTreino = true;
        exibirNotificacaoConquista('Primeiro Treino', 'Você registrou seu primeiro exercício!');
    }
    
    // Verificar 10 exercícios
    if (!conquistas.dezExercicios && exercicios.length >= 10) {
        conquistas.dezExercicios = true;
        exibirNotificacaoConquista('Colecionador', 'Você registrou 10 exercícios diferentes!');
    }
    
    // Verificar 5 dias seguidos
    const sequencia = calcularSequenciaAtual(
        historico.filter(item => item.tipo === 'treino')
            .map(item => item.data.split('T')[0])
    );
    
    if (!conquistas.cincoDiasSeguidos && sequencia >= 5) {
        conquistas.cincoDiasSeguidos = true;
        exibirNotificacaoConquista('Consistente', 'Você treinou por 5 dias seguidos!');
    }
    
    // Verificar 30 dias seguidos
    if (!conquistas.trintaDiasSeguidos && sequencia >= 30) {
        conquistas.trintaDiasSeguidos = true;
        exibirNotificacaoConquista('Disciplinado', 'Você treinou por 30 dias seguidos!');
    }
    
    // Verificar carregamento pesado (exercício com mais de 100kg)
    const temCargaPesada = exercicios.some(ex => parseFloat(ex.carga) >= 100);
    if (!conquistas.carregamentoPesado && temCargaPesada) {
        conquistas.carregamentoPesado = true;
        exibirNotificacaoConquista('Peso Pesado', 'Você treinou com 100kg ou mais em um exercício!');
    }
    
    // Salvar conquistas
    localStorage.setItem('conquistas', JSON.stringify(conquistas));
}

function exibirNotificacaoConquista(titulo, descricao) {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'conquista-notificacao';
    notificacao.innerHTML = `
        <div class="conquista-icone">🏆</div>
        <div class="conquista-texto">
            <h4>Nova Conquista: ${titulo}</h4>
            <p>${descricao}</p>
        </div>
        <button class="fechar-notificacao">×</button>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(notificacao);
    
    // Remover após 5 segundos ou ao clicar em fechar
    setTimeout(() => {
        if (document.body.contains(notificacao)) {
            document.body.removeChild(notificacao);
        }
    }, 5000);
    
    notificacao.querySelector('.fechar-notificacao').addEventListener('click', () => {
        document.body.removeChild(notificacao);
    });
}

function renderizarConquistas() {
    const conquistasContainer = document.getElementById('conquistasContainer');
    if (!conquistasContainer) return;
    
    // Lista de todas as conquistas
    const todasConquistas = [
        {
            id: 'primeiroTreino',
            titulo: 'Primeiro Treino',
            descricao: 'Você registrou seu primeiro exercício',
            icone: '🏅'
        },
        {
            id: 'dezExercicios',
            titulo: 'Colecionador',
            descricao: 'Você registrou 10 exercícios diferentes',
            icone: '🎯'
        },
        {
            id: 'cincoDiasSeguidos',
            titulo: 'Consistente',
            descricao: 'Você treinou por 5 dias seguidos',
            icone: '🔥'
        },
        {
            id: 'trintaDiasSeguidos',
            titulo: 'Disciplinado',
            descricao: 'Você treinou por 30 dias seguidos',
            icone: '💪'
        },
        {
            id: 'carregamentoPesado',
            titulo: 'Peso Pesado',
            descricao: 'Você treinou com 100kg ou mais em um exercício',
            icone: '🏋️'
        }
    ];
    // Renderizar conquistas
    conquistasContainer.innerHTML = `
        <h3>Conquistas</h3>
        <div class="conquistas-grid">
            ${todasConquistas.map(c => `
                <div class="conquista-card ${conquistas[c.id] ? 'conquistado' : 'bloqueado'}">
                    <div class="conquista-icone">${c.icone}</div>
                    <div class="conquista-info">
                        <h5>${c.titulo}</h5>
                        <p>${c.descricao}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ====== Funções Utilitárias ======
function exportarDados() {
    const dados = {
        exercicios: JSON.parse(localStorage.getItem('exercicios')) || [],
        historico: historico,
        conquistas: conquistas
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importarDados(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            
            // Verificar estrutura de dados
            if (dados.exercicios && dados.historico && dados.conquistas) {
                localStorage.setItem('exercicios', JSON.stringify(dados.exercicios));
                localStorage.setItem('historico', JSON.stringify(dados.historico));
                localStorage.setItem('conquistas', JSON.stringify(dados.conquistas));
                
                historico = dados.historico;
                conquistas = dados.conquistas;
                
                alert('Dados importados com sucesso! A página será recarregada.');
                window.location.reload();
            } else {
                alert('Formato de arquivo inválido!');
            }
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    
    reader.readAsText(arquivo);
}

// Adicionar botões de importar/exportar na página de desempenho
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('desempenho.html')) {
        const container = document.querySelector('.container');
        if (container) {
            const botoesBackup = document.createElement('div');
            botoesBackup.className = 'backup-buttons mt-4';
            botoesBackup.innerHTML = `
                <h3>Backup e Restauração</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary" onclick="exportarDados()">Exportar Dados</button>
                    <div class="upload-btn-wrapper">
                        <button class="btn btn-secondary">Importar Dados</button>
                        <input type="file" accept=".json" onchange="importarDados(event)" />
                    </div>
                </div>
            `;
            container.appendChild(botoesBackup);
        }
    }
}); 