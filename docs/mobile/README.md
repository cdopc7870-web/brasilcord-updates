# BrasilCord Web / Mobile — Beta

**Acesso:** https://cdopc7870-web.github.io/brasilcord-updates/mobile/

A PWA compartilha contas, banco PostgreSQL, permissões e serviços de sinalização com o BrasilCord Desktop. Esta versão não converte o executável Electron em aplicativo móvel; utiliza HTML, CSS, JavaScript e APIs oficiais do navegador.

## Funcionalidades incluídas no código

- Login/cadastro compartilhado e verificação de e-mail (quando o backend está configurado)
- Comunidades, convite, descoberta pública, canais de texto e voz
- Cargos e permissões, categorias, configuração básica de comunidades, moderação autorizada
- Chats de canal, mensagens privadas, solicitações, amizades, bloqueios e denúncias
- Responder, editar, apagar, reagir e fixar mensagens conforme permissões
- Imagens e áudios nas DMs, primeira mensagem/foto sujeita a aceite de desconhecidos
- Chamadas de voz WebRTC, vídeo da câmera, compartilhamento de tela se o navegador suportar
- Volume individual, silenciamento, indicação verde de quem está falando
- Perfil, bio, avatar, banner, status, insígnias concedidas e equipadas
- Busca autenticada no histórico de canais e conversas autorizadas
- Enquetes de canais (criação, votos e expiração)
- Notificações em página aberta e avisos de menção @usuário
- PWA instalável, layout responsivo e cache offline somente dos arquivos públicos
- Botão de apoio RedeArk

## Recursos que ainda não atingiram a paridade com o PC / Discord

- Notificações **push** com aplicativo fechado e service worker conectado a provedor Web Push
- Integrações de bots, webhooks públicos e API para desenvolvedores
- Fóruns, threads/tópicos, eventos com calendário e enquetes no cliente Electron
- Cargos múltiplos simultâneos por membro (o modelo atual usa um cargo personalizado por membro)
- Upload geral de arquivos, vídeos em chats e GIFs externos; imagens privadas têm limite de 1 MB
- Chamadas em redes NAT restritas sem um serviço TURN configurado e testado
- Suporte universal a áudio no Safari iOS; depende dos codecs gravados/suportados
- Recuperação de senha, gerenciador de sessões e autenticação TOTP adicional
- Busca indexada com filtros complexos; a busca implementada usa substring e limites para segurança
- Testes ponta a ponta entre Android, iPhone, Chrome, Safari e Electron

Não afirmar que estas funções estão prontas sem novas implementações e validações.

## Instalação

**Android:** abrir o link no Chrome e usar menu → Instalar aplicativo (quando disponível).

**iPhone:** abrir no Safari → Compartilhar → Adicionar à Tela de Início.

**Windows/macOS/Linux:** navegador compatível com PWA, opção de instalar pelo menu.

## Publicação e segurança

- GitHub Pages: `brasilcord-updates/docs/mobile/`, com CI no workflow `.github/workflows/pages.yml`.
- Backend: `brasilcord-codigo-fonte/backend/`, serviço Render `brasilcord-sinalizacao-dkx157`.
- É obrigatório publicar o backend atualizado antes de testar novas rotas web.
- CORS e WebSocket aceitam somente origens HTTPS explicitamente confiáveis (a página oficial já foi adicionada).
- As chamadas pedem permissão de microfone/câmera e usam as APIs de captura do navegador.
- A sinalização WebRTC exige autenticação e verifica o acesso a canais e DMs.
- As contas e permissões estão no servidor; ninguém deve liberar funcionalidades só pelo JavaScript do cliente.
- Token de sessão somente em memória: ao recarregar a página pode ser necessário autenticar novamente.
- Service worker não armazena mensagens, fotos privadas, tokens ou respostas da API.
- Contribuições ao projeto usam somente a página oficial de apoio RedeArk.

## Validação manual essencial

1. Publicar backend Render e GitHub Pages e confirmar que ambos estão online.
2. Efetuar login com duas contas (PC e celular) e conferir se as comunidades são as mesmas.
3. Conferir canais de texto, cargos, menções, enquetes, busca e permissões privadas.
4. Aceitar um pedido de DM e testar fotos, áudio e mensagens em ambos os dispositivos.
5. Fazer uma chamada PC ↔ Web, testar microfone, câmera, tela, volume e encerramento.
6. Repetir a chamada entre conexões diferentes (Wi-Fi / dados móveis). Configurar TURN se necessário.
7. Testar a PWA instalada, abrir offline (deve mostrar apenas o shell) e sair da conta.
8. Verificar que contas comuns não conseguem moderar outras nem visualizar canais privados.

**Nota:** testes automatizados/sintaxe aprovados não substituem os testes reais em dispositivos e redes diferentes.
