// ==UserScript==
// @name         AutoScroll conexao (GitHub - Sem Cache)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Carrega o AutoScroll diretamente da página do GitHub para evitar problemas de cache
// @author       Nimbcorp
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      github.com
// @updateURL    https://raw.githubusercontent.com/n1mb3/autoscroll/refs/heads/main/autoscroll.js
// @downloadURL  https://raw.githubusercontent.com/n1mb3/autoscroll/refs/heads/main/autoscroll.js
// ==/UserScript==

(function() {
    'use strict';
    
    // Log inicial para confirmar que o script está sendo executado
    console.log('🟢 Script de carregamento AutoScroll iniciado');
    
    // URL da página do GitHub onde o script está hospedado
    const githubUrl = 'https://github.com/n1mb3/autoscroll/blob/main/autoscroll.js';
    console.log('🔍 Buscando script em:', githubUrl);
    
    // Função para carregar o script
    function carregarScript() {
        console.log('⏳ Iniciando carregamento do script...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: githubUrl,
            onload: function(response) {
                console.log(`📥 Resposta recebida do GitHub. Status: ${response.status}`);
                console.log(`📄 Tamanho do HTML recebido: ${response.responseText.length} caracteres`);
                
                if (response.status === 200) {
                    // Criar um parser HTML para extrair o conteúdo
                    console.log('🔄 Analisando HTML da página GitHub...');
                    const parser = new DOMParser();
                    const htmlDoc = parser.parseFromString(response.responseText, 'text/html');
                    
                    // Estratégia 1: Tentar o textarea original primeiro
                    let scriptCode = extrairCodigoViaTextarea(htmlDoc);
                    
                    // Estratégia 2: Se falhar, tentar via elementos de linha de código
                    if (!scriptCode) {
                        console.log('🔄 Tentando extrair via elementos de linha de código...');
                        scriptCode = extrairCodigoViaLinhas(htmlDoc);
                    }
                    
                    // Estratégia 3: Tentar encontrar pelo conteúdo de pré-formatação
                    if (!scriptCode) {
                        console.log('🔄 Tentando extrair via elementos pre...');
                        scriptCode = extrairCodigoViaPre(htmlDoc);
                    }
                    
                    // Estratégia 4: Tentar encontrar pelo conteúdo do blob
                    if (!scriptCode) {
                        console.log('🔄 Tentando extrair via blob...');
                        scriptCode = extrairCodigoViaBlob(htmlDoc);
                    }
                    
                    // Se encontramos o código, executá-lo
                    if (scriptCode && scriptCode.trim().length > 0) {
                        console.log(`✅ Código extraído com sucesso. Tamanho: ${scriptCode.length} caracteres`);
                        console.log('📜 Primeiros 100 caracteres do script:', scriptCode.substring(0, 100).replace(/\n/g, ' ') + '...');
                        
                        executarScript(scriptCode);
                    } else {
                        console.error('❌ Não foi possível extrair o código do script usando nenhum método');
                        console.log('Tentando via Raw URL como fallback final...');
                        
                        // Último recurso: tentar carregar da URL raw
                        carregarViaRawURL();
                    }
                } else {
                    console.error('❌ Erro ao carregar a página do GitHub. Status:', response.status);
                    console.error('Resposta:', response.statusText);
                }
            },
            onerror: function(error) {
                console.error('❌ Erro na requisição para o GitHub:', error);
                console.error('Detalhes do erro (se disponíveis):', JSON.stringify(error));
            },
            ontimeout: function() {
                console.error('⏱️ Tempo limite excedido na requisição para o GitHub');
            }
        });
    }
    
    // Função para extrair o código via textarea (método original)
    function extrairCodigoViaTextarea(htmlDoc) {
        console.log('🔍 Tentando encontrar textarea com ID read-only-cursor-text-area...');
        const textArea = htmlDoc.getElementById('read-only-cursor-text-area');
        
        if (textArea && textArea.textContent) {
            console.log('✅ Textarea encontrado com sucesso!');
            return textArea.textContent;
        }
        
        console.log('❓ Textarea não encontrado, buscando outros elementos com atributos similares...');
        
        // Procurar outros textareas que possam conter o código
        const textareas = htmlDoc.querySelectorAll('textarea');
        console.log(`🔢 Encontrados ${textareas.length} textareas na página`);
        
        for (let i = 0; i < textareas.length; i++) {
            const ta = textareas[i];
            if (ta.textContent && ta.textContent.includes('// ==UserScript==') || 
                ta.textContent.includes('function') && ta.textContent.length > 500) {
                console.log(`✅ Encontrado possível código no textarea #${i}`);
                return ta.textContent;
            }
        }
        
        return null;
    }
    
    // Função para extrair o código via linhas de código
    function extrairCodigoViaLinhas(htmlDoc) {
        console.log('🔍 Buscando elementos de linha de código...');
        const lineElements = htmlDoc.querySelectorAll('.react-file-line, .js-file-line, .blob-code-inner');
        
        if (lineElements && lineElements.length > 0) {
            console.log(`✅ Encontrados ${lineElements.length} elementos de linha`);
            let code = '';
            
            lineElements.forEach(line => {
                code += line.textContent + '\n';
            });
            
            return code;
        }
        
        return null;
    }
    
    // Função para extrair o código via elementos pre
    function extrairCodigoViaPre(htmlDoc) {
        console.log('🔍 Buscando elementos pre e code...');
        const preElements = htmlDoc.querySelectorAll('pre, .highlight');
        
        if (preElements && preElements.length > 0) {
            for (let i = 0; i < preElements.length; i++) {
                const pre = preElements[i];
                if (pre.textContent && pre.textContent.length > 500) {
                    console.log(`✅ Encontrado possível código no elemento pre #${i}`);
                    return pre.textContent;
                }
            }
        }
        
        return null;
    }
    
    // Função para extrair o código via elementos do blob
    function extrairCodigoViaBlob(htmlDoc) {
        console.log('🔍 Buscando elementos do blob...');
        
        // Tentar diferentes seletores do GitHub
        const blobContainers = [
            htmlDoc.querySelector('#repo-content-pjax-container'),
            htmlDoc.querySelector('.js-file-content'),
            htmlDoc.querySelector('.Box-sc-g0xbh4-0'),
            htmlDoc.querySelector('.blob-wrapper')
        ];
        
        for (const container of blobContainers) {
            if (container) {
                console.log('✅ Encontrado container de blob');
                
                // Tentar obter todos os textos deste container
                let text = '';
                const lines = container.querySelectorAll('[data-testid="code-cell"]');
                
                if (lines && lines.length > 0) {
                    console.log(`✅ Encontradas ${lines.length} linhas de código`);
                    lines.forEach(line => {
                        text += line.textContent + '\n';
                    });
                    
                    if (text.trim().length > 0) {
                        return text;
                    }
                } else {
                    // Se não encontrou linhas específicas, tentar extrair todo o texto do container
                    text = container.textContent;
                    if (text && text.includes('function') && text.length > 500) {
                        return text;
                    }
                }
            }
        }
        
        return null;
    }
    
    // Função para carregar via URL raw como último recurso
    function carregarViaRawURL() {
        const rawUrl = 'https://raw.githubusercontent.com/n1mb3/autoscroll/main/autoscroll.js';
        console.log('⚠️ Tentando carregar via URL raw:', rawUrl);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: rawUrl,
            onload: function(response) {
                if (response.status === 200 && response.responseText) {
                    console.log('✅ Código carregado com sucesso via raw URL');
                    executarScript(response.responseText);
                } else {
                    console.error('❌ Falha ao carregar via raw URL:', response.status);
                }
            },
            onerror: function() {
                console.error('❌ Erro ao carregar via raw URL');
            }
        });
    }
    
    // Função para executar o script extraído
    function executarScript(scriptCode) {
        console.log('🚀 Executando o script extraído...');
        
        try {
            const scriptElement = document.createElement('script');
            scriptElement.textContent = scriptCode;
            document.head.appendChild(scriptElement);
            console.log('✅ Script executado com sucesso!');
        } catch (err) {
            console.error('❌ Erro ao executar o script:', err);
        }
    }
    
    // Carregar o script quando a página estiver pronta
    if (document.readyState === 'loading') {
        console.log('📃 Página ainda carregando, aguardando evento DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', carregarScript);
    } else {
        console.log('📃 Página já carregada, executando imediatamente...');
        carregarScript();
    }
    
    // Log de verificação das permissões
    console.log('🔐 Verificando permissões do script:');
    console.log('  - GM_xmlhttpRequest disponível:', typeof GM_xmlhttpRequest !== 'undefined' ? '✅ Sim' : '❌ Não');
})();