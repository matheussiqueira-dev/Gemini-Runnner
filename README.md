# Neon Orbit Runner

Runner 3D em React + Three.js com controle por teclado, toque e gestos de mao via camera.

## Visao geral

O projeto entrega uma experiencia arcade de alta velocidade com foco em:
- fluidez visual e responsividade em desktop/mobile;
- arquitetura evolutiva para regras de jogo;
- acessibilidade basica de interface e estados claros de navegacao;
- manutenibilidade com estado tipado e testes automatizados.

## Arquitetura e decisoes tecnicas

### Frontend
- **React 19 + TypeScript** para composicao de interface e seguranca de tipos.
- **@react-three/fiber + three + drei** para renderizacao 3D e objetos de cena.
- **zustand** para estado global do jogo com acoes coesas.

### Camadas principais
- `App.tsx`: shell da aplicacao, canvas 3D e orquestracao de modulos.
- `store.ts`: estado de dominio (partida, progressao, economia, perfil e dificuldade).
- `components/World/*`: cena, entidades, geracao de objetos, colisao e efeitos.
- `components/UI/HUD.tsx`: menu, HUD em tempo real, loja e telas finais.
- `components/Inputs/WebcamController.tsx`: rastreamento de mao e mapeamento de comandos.
- `types.ts`: contratos de dominio, constantes e presets de dificuldade.

### Principios aplicados
- Responsabilidades separadas por dominio (UI, mundo 3D, input, estado).
- Regras de negocio concentradas no store com transicoes explicitas.
- Melhorias visuais desacopladas da logica de jogo (Design System via CSS tokens).
- Foco em robustez: cleanup de streams/listeners, clamp de valores e validacoes de compra.

## Stack e tecnologias

- React 19
- TypeScript 5
- Vite 6
- Three.js / React Three Fiber / Drei
- Zustand
- MediaPipe Tasks Vision
- Vitest

## Estrutura do projeto

```txt
.
|- App.tsx
|- store.ts
|- types.ts
|- index.tsx
|- index.css
|- components/
|  |- Inputs/WebcamController.tsx
|  |- UI/HUD.tsx
|  |- World/Environment.tsx
|  |- World/Effects.tsx
|  |- World/LevelManager.tsx
|  |- World/Player.tsx
|- public/models/hand_landmarker.task
|- tests/store.test.ts
|- vite.config.ts
|- vitest.config.ts
```

## Setup local

### Pre-requisitos
- Node.js 20+
- npm 10+

### Instalacao

```bash
npm install
```

### Variaveis de ambiente

Configure `.env.local`:

```bash
APP_API_KEY=PLACEHOLDER_API_KEY
# opcional: endpoint para receber resumo de sessoes finalizadas
VITE_TELEMETRY_ENDPOINT=https://seu-endpoint/api/game-sessions
```

### Execucao em desenvolvimento

```bash
npm run dev
```

### Build de producao

```bash
npm run build
```

### Preview da build

```bash
npm run preview
```

## Qualidade e testes

Executar testes unitarios:

```bash
npm run test
```

Executar cobertura:

```bash
npm run test:coverage
```

## Deploy

### Fluxo recomendado
1. `npm ci`
2. `npm run test`
3. `npm run build`
4. Publicar pasta `dist/` no provedor (Vercel, Netlify, Cloudflare Pages ou servidor estatico)

## Boas praticas adotadas

- Tokens de design e componentes visuais consistentes.
- Controle de dificuldade com impacto em velocidade e pontuacao.
- Estados terminais com agregacao de metricas de sessao.
- Validacoes de score, distancia, compras e limites de faixa.
- Testes para regras criticas de progressao e economia.

## SEO, rastreamento e indexacao

As otimizacoes de interface e arquitetura foram planejadas para nao remover nem alterar mecanismos existentes de rastreamento/indexacao do projeto. Estruturas de `head`, scripts e meta-informacao permanecem preservaveis e extensivas para integracoes de analytics.

## Melhorias futuras

- Persistencia de perfil local/remote para ranking.
- Modo desafio diario com seed fixa.
- Telemetria de gameplay com dashboard operacional.
- Testes e2e para fluxos completos (menu -> jogo -> loja -> fim).

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
