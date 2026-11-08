# BrasilCord Mobile (PWA) — beta

Endereço da versão web mobile: **https://cdopc7870-web.github.io/brasilcord-updates/mobile/**

Aplicativo web responsivo e instalável com manifest, ícones 192/512, service worker e interface própria do BrasilCord.

## Instalação

- **Android / Chrome:** abra o link acima, toque em **Instalar app** ou no menu do Chrome → **Instalar aplicativo**.
- **iPhone / Safari:** abra a página no Safari, toque em **Compartilhar** → **Adicionar à Tela de Início**.
- **PC:** abra no navegador ou instale como aplicativo web se o navegador oferecer essa opção.

## Funções da primeira versão

- Login/cadastro com a mesma conta do BrasilCord Windows.
- Verificação por código de e-mail, quando ativada no servidor.
- Listar comunidades e entrar por convite; criar comunidade.
- Ler e enviar mensagens nos canais de texto autorizados.
- Conversar com amigos por DM, gerenciar amizades e solicitações de conversa.
- Reações existentes em mensagens e indicação de conversas privadas não lidas.
- Identidade visual responsiva verde/amarelo/azul.
- Instalação na tela inicial e acesso ao shell sem conexão.

**Ainda não implementado no navegador:** calls WebRTC, câmera, transmissão, gravação de áudio, upload e reprodução de fotos privadas, gerenciamento avançado de cargos/moderação, push notification de background. Esses recursos continuam no aplicativo Windows onde já existirem.

## Segurança e arquitetura

- Front-end estático em GitHub Pages (repositório público brasilcord-updates, pasta docs/mobile).
- API autenticada centralizada no serviço `brasilcord-sinalizacao-dkx157.onrender.com/api/platform`.
- O backend aceita CORS apenas da origem oficial `https://cdopc7870-web.github.io` e das origens HTTPS configuradas explicitamente em `BRASILCORD_PWA_ORIGINS` (se necessário).
- Token de login somente em **memória**: por segurança a sessão não é gravada em localStorage. Fechar ou recarregar a PWA exige login novamente.
- O service worker armazena **apenas arquivos públicos do aplicativo**. API, mensagens, tokens, fotos e dados de usuários não são armazenados offline.
- Solicitações REST usam `credentials:'omit'`, Bearer token na autorização e HTTPS.
- Permissões continuam verificadas no backend: a PWA não contorna cargos, bloqueios e restrições.
- A PWA usa polling para atualizações nesta primeira versão; WebSocket e notificações push serão uma evolução posterior.

## Publicação

O workflow `.github/workflows/pages.yml` publica a pasta docs inteira. Não configure uma implantação separada para a PWA. A versão mobile está no caminho `/brasilcord-updates/mobile/` do site já publicado.

**Dependência importante:** o backend privado `brasilcord-codigo-fonte` deve estar com o commit que habilita CORS da origem GitHub Pages implantado no Render. Antes desse deploy, o login pelo navegador falhará por bloqueio de origem.

## Validação manual

1. Abrir a URL em Chrome Android e Safari iOS.
2. Abrir as ferramentas de rede e verificar `OPTIONS /api/platform/login` retornando CORS para a origem oficial.
3. Testar login/OTP e confirmar que a rede exibe a sessão autenticada.
4. Verificar comunidades, postar em canal e conferir a mensagem em um segundo dispositivo.
5. Enviar uma DM e aceitar uma solicitação de conversa.
6. Instalar a PWA, abrir em modo standalone e validar navegação responsiva.
7. Desligar a internet e confirmar que apenas os arquivos públicos do shell abrem; nenhuma mensagem privada fica disponível offline.
