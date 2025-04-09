// ==UserScript==
// @name         Autoscroll Nimbcorp
// @namespace    http://tampermonkey.net/
// @version      2
// @description  Adiciona botão de AutoScroll em páginas, remove banner e salva progresso (com velocidade constante)
// @author       Nimbcorp
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Identificador único para a página atual (URL sem parâmetros)
    const pageId = window.location.origin + window.location.pathname;

    // Função para remover o banner após um certo tempo
    function removerBanner(tempo = 3000) {
        setTimeout(function() {
            const banner = document.getElementById('banner');
            if (banner) {
                banner.remove();
                console.log('Banner removido com sucesso!');
            } else {
                console.log('Banner não encontrado na página');
            }
        }, tempo);
    }

    // Função principal executada quando a página carrega
    function iniciarAutoScroll() {
        // Chama a função para remover banner
        removerBanner(2000); // Remove após 2 segundos

        // Não inicia se já estiver rolando
        if (document.getElementById('fsocietyAutoScrollBtn')) {
            return;
        }

        // Cria um container para os controles
        const container = document.createElement('div');
        container.id = 'fsocietyAutoScrollContainer';
        container.style.position = 'fixed';

        // Posiciona o container no meio da lateral esquerda da tela
        container.style.top = '50%';
        container.style.left = '-5px';
        container.style.transform = 'translateY(-50%)'; // Centraliza verticalmente

        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        container.style.backgroundColor = 'rgba(45, 45, 45, 0.7)';
        container.style.padding = '5px 10px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        container.style.cursor = 'grab'; // Indica que é arrastável
        container.style.userSelect = 'none'; // Evita seleção de texto durante o arrasto
        container.style.touchAction = 'none'; // Previne comportamentos de toque padrão

        // Carrega posição salva, se existir
        const savedPosition = loadContainerPosition();
        if (savedPosition) {
            container.style.top = savedPosition.top + 'px';
            container.style.left = savedPosition.left + 'px';
            container.style.transform = 'none'; // Remove transformação quando usar posição salva
        }

        // Container para os controles minimizados
        const miniControls = document.createElement('div');
        miniControls.id = 'fsocietyMiniControls';
        miniControls.style.display = 'flex';
        miniControls.style.flexDirection = 'column';
        miniControls.style.alignItems = 'center';
        miniControls.style.gap = '5px';

        // Indicador de progresso (sempre visível)
        const progressDisplay = document.createElement('div');
        progressDisplay.id = 'fsocietyProgressDisplay';
        progressDisplay.style.color = '#00ff00';
        progressDisplay.style.fontSize = '10px';
        progressDisplay.style.textAlign = 'center';
        progressDisplay.style.width = '100%';
        progressDisplay.style.marginTop = '5px';
        progressDisplay.style.fontWeight = 'bold';
        progressDisplay.textContent = '0%';
        progressDisplay.dataset.lastPercentage = '0'; // Para evitar atualizações desnecessárias

        // Função para criar botões de controle
        function createControlButton(text, title) {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.title = title;
            btn.style.backgroundColor = '#333333';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '3px';
            btn.style.width = '25px';
            btn.style.height = '25px';
            btn.style.fontSize = '10px';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.style.margin = '0 auto';
            btn.className = 'fsociety-control-button'; // Adiciona classe para manipular visibilidade
            return btn;
        }

        // Botões de navegação
        const nextChapterBtn = createControlButton('▶', 'Próximo Capítulo');
        const increaseBtn = createControlButton('+', 'Aumentar velocidade');
        const decreaseBtn = createControlButton('-', 'Diminuir velocidade');
        const prevChapterBtn = createControlButton('◀', 'Capítulo Anterior');
        const fullscreenBtn = createControlButton('⛶', 'Modo Tela Cheia'); // Novo botão para modo tela cheia

        // Display da velocidade atual
        const speedDisplay = document.createElement('div');
        speedDisplay.id = 'fsocietyMiniSpeedDisplay';
        speedDisplay.style.color = 'white';
        speedDisplay.style.fontSize = '10px';
        speedDisplay.style.textAlign = 'center';
        speedDisplay.style.width = '100%';
        speedDisplay.className = 'fsociety-control-element'; // Adiciona classe para manipular visibilidade

        // Adiciona os elementos ao container
        miniControls.appendChild(nextChapterBtn);
        miniControls.appendChild(increaseBtn);
        miniControls.appendChild(speedDisplay);
        miniControls.appendChild(decreaseBtn);
        miniControls.appendChild(prevChapterBtn);
        miniControls.appendChild(fullscreenBtn); // Adiciona o botão de tela cheia
        miniControls.appendChild(progressDisplay);
        container.appendChild(miniControls);

        // Adiciona o container à página
        document.body.appendChild(container);

        // Implementa funcionalidade de arrastar
        makeDraggable(container);

        // Função para navegar para o próximo/anterior capítulo
        function navigateToChapter(direction) {
            // Obtém a URL atual
            const currentUrl = window.location.href;
            let newUrl = null;

            // Padrões comuns para URLs de capítulos
            const patterns = [
                // Padrão: capitulo-XX ou capitulo-XX.html
                { regex: /capitulo-(\d+)(\.html)?/i, replace: (match, p1, p2) => `capitulo-${parseInt(p1) + direction}${p2 || ''}` },

                // Padrão: cap-XX ou cap-XX.html
                { regex: /cap-(\d+)(\.html)?/i, replace: (match, p1, p2) => `cap-${parseInt(p1) + direction}${p2 || ''}` },

                // Padrão: /cap/XX ou /capitulo/XX
                { regex: /\/(cap|capitulo)\/(\d+)/i, replace: (match, p1, p2) => `/${p1}/${parseInt(p2) + direction}` },

                // Padrão: capitulo-XX.html#google_vignette
                { regex: /(capitulo-|cap-)(\d+)(\.html#.*)/i, replace: (match, p1, p2, p3) => `${p1}${parseInt(p2) + direction}${p3}` },

                // Padrão: /XXXX/cap-XX
                { regex: /\/(\d+)\/cap-(\d+)/i, replace: (match, p1, p2) => `/${p1}/cap-${parseInt(p2) + direction}` },

                // Padrão genérico para números no final da URL
                { regex: /(\d+)([^\d]*)$/, replace: (match, p1, p2) => `${parseInt(p1) + direction}${p2}` }
            ];

            // Tenta cada padrão até encontrar uma correspondência
            for (const pattern of patterns) {
                if (pattern.regex.test(currentUrl)) {
                    newUrl = currentUrl.replace(pattern.regex, pattern.replace);
                    break;
                }
            }

            // Se encontrou um padrão e gerou uma nova URL, navegue para ela
            if (newUrl && newUrl !== currentUrl) {
                console.log(`Navegando para: ${newUrl}`);
                window.location.href = newUrl;
            } else {
                console.log("Não foi possível identificar o padrão de capítulos na URL atual.");
            }
        }

        // Adiciona eventos para os botões de navegação
        nextChapterBtn.addEventListener('click', () => navigateToChapter(1)); // Próximo capítulo (+1)
        prevChapterBtn.addEventListener('click', () => navigateToChapter(-1)); // Capítulo anterior (-1)

        // Adiciona evento para o botão de tela cheia
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Inicializa as variáveis para controle do scroll
        if (!window.fsocietyScrollInitialized) {
            window.fsocietyScrollInitialized = true;
            window.isScrolling = false; // Inicia pausado
            window.scrollSpeed = 1.4; // Velocidade inicial e constante

            // *** Nova função de scroll com velocidade constante ***
            window.smoothScroll = function() {
                if (!window.isScrolling) {
                    window.smoothScrollActive = false;
                    return; // Se não estiver rolando, simplesmente retorna
                }
                
                // Aplica diretamente a velocidade selecionada, sem aceleração/desaceleração
                window.scrollBy({
                    top: window.scrollSpeed * 2, // Multiplicador para ajustar a velocidade
                    behavior: 'auto' // 'auto' é mais eficiente que 'smooth'
                });

                window.smoothScrollActive = true;
                window.smoothScrollInterval = requestAnimationFrame(window.smoothScroll);
            };

            // Configurar o scroll, mas não iniciar automaticamente
            window.smoothScrollActive = false;

            // Adiciona o controle por tecla de espaço
            if (!window.keyListenerAdded) {
                window.keyListenerAdded = true;
                window.keyListener = function(e) {
                    if (e.keyCode === 32 || e.key === ' ') {
                        if (document.activeElement.tagName === 'INPUT' ||
                            document.activeElement.tagName === 'TEXTAREA' ||
                            document.activeElement.isContentEditable) {
                            return;
                        }
                        e.preventDefault();
                        toggleScrollState();
                    }
                };
                window.addEventListener('keydown', window.keyListener);
            }

            // Configura um intervalo separado para atualizar a UI (desacoplado da animação)
            window.progressUpdateInterval = setInterval(function() {
                updateScrollProgress(); // Sempre atualiza, independente do estado de rolagem
            }, 200); // Atualiza a cada 200ms - frequência suficiente para UI

            // Adiciona evento de scroll para atualizar o progresso durante rolagem manual
            if (!window.scrollListenerAdded) {
                window.scrollListenerAdded = true;
                window.scrollListener = function() {
                    updateScrollProgress();
                };
                window.addEventListener('scroll', window.scrollListener, { passive: true });
            }

            console.log('FSociety AutoScroll inicializado. Rolagem automática pausada. Pressione espaço ou dê duplo clique para iniciar.');
        }

        // Função otimizada para calcular e atualizar o progresso do scroll
        function updateScrollProgress() {
            // Calcula a altura total rolável da página de forma mais precisa
            const docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            );
            
            const viewportHeight = window.innerHeight;
            const scrollableHeight = docHeight - viewportHeight;
            
            // Se não houver altura rolável (página muito pequena), não atualiza
            if (scrollableHeight <= 0) {
                return;
            }
            
            // Obtém a posição atual de scroll de forma confiável
            const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            
            // Calcula a porcentagem de forma precisa
            const percentage = Math.min(100, Math.max(0, Math.round((scrollPosition / scrollableHeight) * 100)));
            
            const progressElement = document.getElementById('fsocietyProgressDisplay');
            if (progressElement && progressElement.dataset.lastPercentage != percentage) {
                progressElement.textContent = `${percentage}%`;
                progressElement.dataset.lastPercentage = percentage;

                // Mudando cor conforme progresso
                if (percentage < 30) {
                    progressElement.style.color = '#00ff00'; // Verde
                } else if (percentage < 70) {
                    progressElement.style.color = '#ffff00'; // Amarelo
                } else {
                    progressElement.style.color = '#ff9900'; // Laranja
                }
            }
        }

        // Define o valor inicial do slider baseado na velocidade atual
        speedDisplay.textContent = `${window.scrollSpeed.toFixed(1)}x`;

        // Função para atualizar todos os displays de velocidade
        function updateSpeedDisplays() {
            speedDisplay.textContent = `${window.scrollSpeed.toFixed(1)}x`;
        }

        // Adiciona eventos para os botões de + e -
        increaseBtn.addEventListener('click', function() {
            window.scrollSpeed = Math.min(3.0, window.scrollSpeed + 0.1);
            updateSpeedDisplays();
            console.log('Velocidade aumentada para: ' + window.scrollSpeed.toFixed(1));
        });

        decreaseBtn.addEventListener('click', function() {
            window.scrollSpeed = Math.max(0.5, window.scrollSpeed - 0.1);
            updateSpeedDisplays();
            console.log('Velocidade reduzida para: ' + window.scrollSpeed.toFixed(1));
        });

        // Função para esconder/mostrar os controles com base no estado do scroll
        function updateControlsVisibility() {
            const controls = document.querySelectorAll('.fsociety-control-button, .fsociety-control-element');
            
            if (window.isScrolling) {
                // Quando ativo (rolando), esconde tudo exceto a porcentagem
                controls.forEach(control => {
                    control.style.display = 'none';
                });
            } else {
                // Quando pausado, mostra todos os controles
                controls.forEach(control => {
                    if (control.tagName === 'BUTTON') {
                        control.style.display = 'flex';
                    } else {
                        control.style.display = 'block';
                    }
                });
            }
        }

        // Função para alternar o estado de scroll (ainda útil para o espaço e duplo clique)
        function toggleScrollState() {
            window.isScrolling = !window.isScrolling;
            console.log('AutoScroll ' + (window.isScrolling ? 'iniciado' : 'pausado'));

            // Atualiza a visibilidade dos controles com base no novo estado
            updateControlsVisibility();

            // Se estamos iniciando o scroll e não está ativo, iniciar
            if (window.isScrolling && !window.smoothScrollActive) {
                window.smoothScrollActive = true;

                // Cancelamos qualquer frame anterior que possa estar pendente
                if (window.smoothScrollInterval) {
                    cancelAnimationFrame(window.smoothScrollInterval);
                }

                // Iniciamos o scroll
                window.smoothScrollInterval = requestAnimationFrame(window.smoothScroll);
            }
        }

        // Define a visibilidade inicial dos controles (parado = mostrando tudo)
        updateControlsVisibility();

        // Disponibiliza a função globalmente para ser acessada pelo duplo clique
        window.fsocietyToggleScrollState = toggleScrollState;

        // Adiciona evento de duplo clique para iniciar/pausar o AutoScroll
        if (!window.dblClickListenerAdded) {
            window.dblClickListenerAdded = true;
            window.dblClickListener = function(e) {
                // Verifica se o clique não foi em um input, botão ou elemento interativo
                if (e.target.tagName === 'INPUT' ||
                    e.target.tagName === 'BUTTON' ||
                    e.target.tagName === 'TEXTAREA' ||
                    e.target.tagName === 'SELECT' ||
                    e.target.isContentEditable ||
                    e.target.closest('#fsocietyAutoScrollContainer')) {
                    return;
                }
                window.fsocietyToggleScrollState();
            };
            document.addEventListener('dblclick', window.dblClickListener);
        }

        // Função para alternar entre modo de tela cheia e modo normal
        function toggleFullscreen() {
            if (!document.fullscreenElement && 
                !document.mozFullScreenElement && 
                !document.webkitFullscreenElement && 
                !document.msFullscreenElement) {
                // Entra no modo de tela cheia
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    document.documentElement.msRequestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                }
                fullscreenBtn.innerText = '⛶';
                fullscreenBtn.title = 'Sair da Tela Cheia';
            } else {
                // Sai do modo de tela cheia
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                fullscreenBtn.innerText = '⛶';
                fullscreenBtn.title = 'Modo Tela Cheia';
            }
        }

        // Detecta mudanças no estado de tela cheia para atualizar o botão
        document.addEventListener('fullscreenchange', updateFullscreenButton);
        document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
        document.addEventListener('mozfullscreenchange', updateFullscreenButton);
        document.addEventListener('MSFullscreenChange', updateFullscreenButton);

        function updateFullscreenButton() {
            if (document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement) {
                fullscreenBtn.innerText = '⛶';
                fullscreenBtn.title = 'Sair da Tela Cheia';
            } else {
                fullscreenBtn.innerText = '⛶';
                fullscreenBtn.title = 'Modo Tela Cheia';
            }
        }

        // Atualiza o progresso inicial
        updateScrollProgress();
    }

    // Função para salvar posição do container no localStorage
    function saveContainerPosition(position) {
        try {
            localStorage.setItem('fsociety_position_' + pageId, JSON.stringify(position));
            console.log(`Posição salva: ${position.left}x${position.top}`);
        } catch (e) {
            console.error('Erro ao salvar posição:', e);
        }
    }

    // Função para carregar posição do container do localStorage
    function loadContainerPosition() {
        try {
            const savedPosition = localStorage.getItem('fsociety_position_' + pageId);
            return savedPosition ? JSON.parse(savedPosition) : null;
        } catch (e) {
            console.error('Erro ao carregar posição:', e);
            return null;
        }
    }

    // Função para tornar o container arrastável
    function makeDraggable(element) {
        let isDragging = false;
        let startX, startY;
        let startPosX, startPosY;

        // Adiciona uma "alça" para arrastar no topo do container
        const dragHandle = document.createElement('div');
        dragHandle.style.width = '100%';
        dragHandle.style.height = '10px';
        dragHandle.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
        dragHandle.style.borderRadius = '3px 3px 0 0';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.marginBottom = '3px';
        dragHandle.title = 'Arraste para mover';
        dragHandle.className = 'fsociety-control-element'; // Adiciona classe para manipular visibilidade

        // Insere a alça no topo do container
        if (element.firstChild) {
            element.insertBefore(dragHandle, element.firstChild);
        } else {
            element.appendChild(dragHandle);
        }

        // Eventos de mouse para arrastar
        dragHandle.addEventListener('mousedown', startDrag);
        // Adiciona eventos de toque para suporte em tablets/celulares
        dragHandle.addEventListener('touchstart', startTouchDrag, { passive: false });

        function startDrag(e) {
            // Evita a seleção de texto durante o arrasto
            e.preventDefault();

            // Inicia o arrasto
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Obtém a posição atual do elemento
            const rect = element.getBoundingClientRect();
            startPosX = rect.left;
            startPosY = rect.top;

            // Altera o cursor para indicar arrasto ativo
            element.style.cursor = 'grabbing';
            dragHandle.style.cursor = 'grabbing';

            // Adiciona os event listeners para movimento e término do arrasto
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        }

        function startTouchDrag(e) {
            // Previne o comportamento padrão (scroll, zoom, etc)
            e.preventDefault();

            if (e.touches.length === 1) { // Verifica se há apenas um toque
                // Inicia o arrasto
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;

                // Obtém a posição atual do elemento
                const rect = element.getBoundingClientRect();
                startPosX = rect.left;
                startPosY = rect.top;

                // Adiciona os event listeners para movimento e término do toque
                document.addEventListener('touchmove', onTouchDrag, { passive: false });
                document.addEventListener('touchend', stopTouchDrag);
                document.addEventListener('touchcancel', stopTouchDrag);
            }
        }

        function onDrag(e) {
            if (!isDragging) return;

            // Calcula o deslocamento do mouse
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Calcula a nova posição do elemento
            const newLeft = startPosX + dx;
            const newTop = startPosY + dy;

            // Limita a posição dentro da janela
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;

            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            element.style.transform = 'none'; // Remove transformação quando movido
        }

        function onTouchDrag(e) {
            if (!isDragging || e.touches.length !== 1) return;

            // Previne o scroll da página enquanto arrasta
            e.preventDefault();

            // Obtém a posição atual do toque
            const touch = e.touches[0];

            // Calcula o deslocamento do toque
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            // Calcula a nova posição do elemento
            const newLeft = startPosX + dx;
            const newTop = startPosY + dy;

            // Limita a posição dentro da janela
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;

            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            element.style.transform = 'none'; // Remove transformação quando movido
        }

        function stopDrag() {
            if (!isDragging) return;

            // Finaliza o arrasto
            isDragging = false;

            // Restaura o cursor
            element.style.cursor = 'default';
            dragHandle.style.cursor = 'grab';

            // Remove os event listeners
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);

            // Salva a posição final
            savePositionAfterDrag();
        }

        function stopTouchDrag() {
            if (!isDragging) return;

            // Finaliza o arrasto
            isDragging = false;

            // Remove os event listeners
            document.removeEventListener('touchmove', onTouchDrag);
            document.removeEventListener('touchend', stopTouchDrag);
            document.removeEventListener('touchcancel', stopTouchDrag);

            // Salva a posição final
            savePositionAfterDrag();
        }

        function savePositionAfterDrag() {
            // Salva a posição final
            const position = {
                left: parseInt(element.style.left),
                top: parseInt(element.style.top)
            };
            saveContainerPosition(position);
        }
    }

    // Função para remover o AutoScroll
    function pararAutoScroll() {
        // Encontra e remove o container de AutoScroll
        const autoScrollContainer = document.getElementById('fsocietyAutoScrollContainer');
        if (autoScrollContainer) {
            autoScrollContainer.remove();
        }

        // Limpa o estado e para o scroll
        window.isScrolling = false;
        window.fsocietyScrollInitialized = false;

        if (window.smoothScrollInterval) {
            cancelAnimationFrame(window.smoothScrollInterval);
            window.smoothScrollInterval = null;
        }

        // Limpa o intervalo de atualização de progresso
        if (window.progressUpdateInterval) {
            clearInterval(window.progressUpdateInterval);
            window.progressUpdateInterval = null;
        }

        // Remove o event listener do teclado se possível
        if (window.keyListener) {
            window.removeEventListener('keydown', window.keyListener);
            window.keyListenerAdded = false;
        }

        // Remove o event listener de duplo clique
        if (window.dblClickListener) {
            document.removeEventListener('dblclick', window.dblClickListener);
            window.dblClickListenerAdded = false;
        }

        // Remove os event listeners de tela cheia
        document.removeEventListener('fullscreenchange', updateFullscreenButton);
        document.removeEventListener('webkitfullscreenchange', updateFullscreenButton);
        document.removeEventListener('mozfullscreenchange', updateFullscreenButton);
        document.removeEventListener('MSFullscreenChange', updateFullscreenButton);

        // Remove o event listener do scroll se possível
        if (window.scrollListener) {
            window.removeEventListener('scroll', window.scrollListener);
            window.scrollListenerAdded = false;
        }

        console.log("AutoScroll completamente removido da página.");
    }

    // Aguarda o carregamento completo da página antes de iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarAutoScroll);
    } else {
        iniciarAutoScroll();
    }

    // Adiciona um botão para remover o AutoScroll (opcional)
    // Você pode descomentar esta linha se quiser essa funcionalidade
    // window.addEventListener('beforeunload', pararAutoScroll);
})();