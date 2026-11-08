# BrasilCord — atualizações

Este repositório público distribui os instaladores Windows e os metadados usados pelo atualizador automático do BrasilCord.

Instale a versão mais recente pela página de [Releases](https://github.com/cdopc7870-web/brasilcord-updates/releases/latest). O aplicativo verifica atualizações ao iniciar, baixa em segundo plano e instala quando for fechado.

O código-fonte permanece no repositório privado [brasilcord-codigo-fonte](https://github.com/cdopc7870-web/brasilcord-codigo-fonte).

## 🇧🇷 Site oficial BrasilCord

O site de apresentação e download está na pasta [`docs/`](./docs) e é publicado usando GitHub Pages.

**Endereço previsto após a ativação do Pages:** https://cdopc7870-web.github.io/brasilcord-updates/

O site inclui:
- Página responsiva com identidade verde, amarela e azul;
- Prévia ilustrativa (não uma captura real) do app;
- Recursos, comunidade oficial, perguntas frequentes e instruções de download;
- Botão que consulta a API pública do GitHub Releases para usar o instalador Windows mais recente;
- Fallback para a página pública de Releases se a API não estiver acessível;
- Sem login no site, rastreadores, envio de dados pessoais ou exposição do código-fonte privado.

### Ativação (somente uma vez)

1. Abra **Settings → Pages** deste repositório público.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Verifique o workflow [Publicar site BrasilCord](./.github/workflows/pages.yml) em **Actions**.
4. Quando a implantação concluir, acesse https://cdopc7870-web.github.io/brasilcord-updates/.

O site é implantado automaticamente quando os arquivos de `docs/` mudam na branch `main`. As versões do instalador continuam sendo publicadas via GitHub Releases; o site consulta a versão atual automaticamente.

O site é estático. Contas e mensagens de usuários continuam no backend da plataforma e **não** são armazenadas no GitHub Pages.
