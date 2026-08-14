# Desafio Mobile — Roteirização e Leitura

Aplicativo mobile offline-first para apoio a equipes de leitura em campo. Simula o fluxo de
carregar uma rota de atendimento, visitar cada ponto, registrar leitura + foto + localização, e
sincronizar os registros posteriormente.

## Instruções de execução

Pré-requisitos: Node.js LTS, npm, e um emulador Android (Android Studio) ou dispositivo físico
com Expo Go/dev client.

```bash
npm install
npx expo start
```

No terminal do Metro, pressione `a` para abrir no emulador/dispositivo Android, ou escaneie o QR
code com o Expo Go (caso a versão do Expo Go instalada seja compatível com o SDK 54; caso
contrário, use `npx expo run:android` para gerar um dev client).

## Tecnologias utilizadas

- **Expo SDK 54 (React Native 0.86, React 19)** — workflow gerenciado, permite build para Android
  sem configuração nativa manual, e concentra num único framework tudo que o desafio pede
  (câmera, localização, persistência).
- **expo-sqlite** — persistência local relacional. Escolhido em vez de AsyncStorage porque o
  domínio (rota + pontos + visitas, com relacionamento entre eles) se beneficia de um schema
  relacional simples, e a API assíncrona (`openDatabaseAsync`, `execAsync`, `runAsync`,
  `getAllAsync`, `getFirstAsync`) do SDK 57 é direta de usar sem dependências extras.
- **expo-camera** (`CameraView` + `useCameraPermissions`) — captura de foto durante o
  atendimento.
- **expo-location** (`useForegroundPermissions` + `getCurrentPositionAsync`) — captura de
  latitude/longitude/timestamp durante o atendimento.
- **zustand** — gerenciamento de estado global leve (`routeStore` para a rota carregada,
  `visitStore` para as visitas e status de sincronização), sem o boilerplate de Redux.
- **@react-navigation/native + native-stack** — navegação entre a lista de pontos e o detalhe do
  atendimento. Única dependência nova adicionada além do que já vinha no scaffold; optou-se por
  ela em vez de uma troca manual de telas por ser o padrão esperado em um app React Native e por
  já resolver back-gesture/header de graça.
- **@react-native-community/netinfo** — detecção de conectividade online/offline, usada para
  refletir o status na interface e disparar sincronização automática ao reconectar.
- **react-native-webview + Leaflet/OpenStreetMap** — mapa da rota (`src/components/RouteMap.tsx`),
  com agregação de visitas por região e traçado colorido do percurso. Ver justificativa detalhada
  em [Mapa: Leaflet/OpenStreetMap via WebView](#mapa-leafletopenstreetmap-via-webview).

## Funcionamento offline

Ao abrir o app, `src/services/routeService.ts` tenta buscar a rota como se fosse uma chamada de
API real (`fetchRouteFromApi`, com verificação de conectividade via `NetInfo` e um atraso
artificial simulando a rede — na prática lê `src/data/rota_aldeota_mira.json`, já que o desafio
não tem backend real, mas a função tem a mesma assinatura assíncrona de um `fetch()` de verdade,
então trocar por uma chamada HTTP real não exige mexer em mais nada):

- **Sucesso**: a rota é persistida no SQLite local (`insertRouteIfMissing`) e exibida.
- **Falha por falta de internet/erro de rede**: cai para o SQLite local. Se já existir rota
  salva de uma execução anterior, ela é carregada normalmente — o app funciona offline. Se for o
  primeiro acesso e não houver nada salvo ainda, a store lança `OfflineNoCacheError` e a tela
  mostra um estado vazio dedicado ("Você está offline e não há dados salvos...") com botão
  **Tentar novamente**, em vez de travar ou mostrar uma tela em branco.

Importante: a rota só é buscada/inserida uma vez — `insertRouteIfMissing` não sobrescreve uma
rota já salva. Isso é proposital: o status de cada ponto evolui localmente conforme o usuário
registra visitas, e um `fetch` bem-sucedido em toda abertura do app não deve resetar esse
progresso de volta ao payload estático da "API". Isso significa que, mesmo sem conexão com a
internet e mesmo depois de fechar e reabrir o app, a rota e todas as visitas registradas
continuam disponíveis. O registro de uma nova visita (leitura + foto + localização) também é
gravado localmente de forma síncrona, sem depender de rede em nenhum momento do fluxo.

## Estratégia de sincronização

Cada visita concluída é salva com `syncStatus: 'pending'`. A sincronização é simulada em
`src/services/syncService.ts`: a função `syncAllPending` percorre as visitas pendentes,
transiciona cada uma para `'syncing'`, aguarda um atraso artificial (simulando uma chamada de
rede) e então marca como `'synced'`, persistindo cada transição no SQLite. A função `syncVisit`
foi propositalmente estruturada como se fizesse uma chamada real (`apiClient.post('/visits',
visit)` comentado no código) — para trocar pela sincronização real bastaria substituir o corpo
dessa função por uma chamada HTTP, sem alterar `visitStore` ou a UI. Sincronização automática é
disparada quando o app detecta a transição offline → online e existem visitas pendentes
(`RouteListScreen`, via `useNetworkStatus`).

## Decisões técnicas

- **Uma visita por ponto**: a tabela `visits` tem `UNIQUE(point_id)` com `INSERT ... ON CONFLICT
DO UPDATE`, então revisitar um ponto antes da sincronização sobrescreve o registro em vez de
  criar duplicatas.
- **Botão "Concluir visita" habilitado apenas com leitura válida**: foto e localização são
  capturadas quando possível, mas não bloqueiam a conclusão da visita — evita travar o fluxo caso
  a câmera ou o GPS falhem no emulador/dispositivo de teste.
- **JSON de rota bundlado via import estático** (`src/data/rota_aldeota_mira.json`) em vez de
  lido via `FileSystem`/`fetch` — o Metro empacota o JSON no bundle JS, então ele está disponível
  offline desde o primeiro boot, sem passo de download.
- **Separação em camadas**: telas (`src/screens`) → estado (`src/store`) → serviços
  (`src/services`) → persistência (`src/storage`), cada camada só conhece a imediatamente
  abaixo.

## Mapa: Leaflet/OpenStreetMap via WebView

A visualização de rota (`src/components/RouteMap.tsx`) inicialmente foi implementada com
`react-native-maps` sobre Google Maps. Ao longo do desenvolvimento, essa escolha se mostrou
inconsistente para o prazo de entrega: o Google Maps no Android depende de uma chave de API
própria, vinculada a um projeto no Google Cloud com faturamento habilitado e restrições de
pacote/certificado (SHA-1) configuradas corretamente — e, diferente do restante do app, esse
mapa só roda de fato em um build nativo (`expo run:android`), já que o Expo Go não suporta o
plugin de configuração nativa do `react-native-maps`. Isso significa validar a chave contra um
build completo a cada ajuste, e qualquer chave mal configurada (API não habilitada, restrição
incorreta, faturamento pendente) resulta em mapa em branco, sem erro visível em tela — um ponto
de falha frágil e fora do controle do código-fonte, incompatível com um prazo apertado.

Diante disso, a decisão estratégica foi migrar o mapa para **Leaflet + OpenStreetMap, renderizado
dentro de uma `WebView` (`react-native-webview`)**. Essa troca elimina por completo a dependência
de chave de API proprietária e de faturamento no Google Cloud: o Leaflet é carregado via CDN
pública (sem autenticação) e os tiles vêm do servidor público do OpenStreetMap, sem cadastro ou
custo. Como consequência direta, o app volta a rodar de forma imediata e estável no Expo Go — o
`react-native-webview` é um módulo suportado nativamente pelo Expo Go, sem exigir dev client —, o
que é exatamente o ambiente de execução mais rápido para avaliação do desafio. O estilo visual
dos tiles usa o basemap **CARTO Voyager** (mesmos dados do OpenStreetMap, cartografia mais limpa
e atual que o estilo clássico do OSM) — também público e sem chave.

A migração foi feita preservando integralmente as regras de negócio já validadas na versão
anterior:

- **Agregação de visitas por região**: `RouteMap.tsx` calcula, a cada zoom/pan, clusters por
  proximidade em pixels de tela (mesma lógica de "visitas próximas colapsam em um único marcador
  com o total"). Um cluster com um único status mostra um selo colorido com a contagem
  (`#f59e0b` pendente / `#10b981` concluído); um cluster misto mostra dois selos lado a lado —
  um laranja com a contagem de pendentes, um verde com a de concluídas — em vez de um único
  número sob a cor predominante, que escondia quantas visitas de cada status existiam ali.
- **Traçado de rota colorido**: as polylines continuam sendo desenhadas entre os pontos na ordem
  original da rota, com a cor definida pelo status do ponto de destino de cada segmento — regra
  inalterada em relação à implementação anterior.
- **Detalhes da visita a partir do mapa**: tocar em um marcador abre um popup com endereço e
  status; tocar em "Ver detalhes" navega para a tela do ponto, via mensagens
  `postMessage`/`onMessage` entre a `WebView` e o React Native.

O mapa ocupa 100% do container, com gestos de toque/zoom nativos do Leaflet, e mantém pan/zoom
estáveis entre re-renderizações: o HTML é carregado uma única vez e os dados dos pontos são
injetados via `injectJavaScript` a cada atualização, em vez de recarregar a página inteira.

## Limitações conhecidas

- Sem backend real — toda sincronização é simulada localmente, conforme especificado no desafio.
- Sem tratamento de falha de sincronização (retry/estado `error`) implementado — o `SyncStatus`
  já contempla `'error'` no tipo, mas o fluxo de simulação atual sempre termina em sucesso; seria
  a próxima extensão natural do `syncService.ts`.
- Sem testes automatizados — item listado como diferencial no desafio, não implementado por
  priorização do fluxo obrigatório.
- Ícones em `assets/` são placeholders de cor sólida gerados para o app buildar; não são arte
  final.
- Os tiles do mapa (OpenStreetMap/CARTO) exigem conexão com a internet para carregar as imagens
  — a mesma limitação existiria com qualquer provedor de mapa baseado em tiles. A biblioteca
  Leaflet em si é embarcada no bundle (`src/components/leafletDist.ts`), não carregada de CDN,
  então o mapa inicializa e continua mostrando marcadores/rotas normalmente mesmo sem conexão;
  só os tiles de fundo ficam em branco. O restante do app (rota, visitas, leitura, foto,
  localização) continua 100% funcional offline, conforme descrito em
  [Funcionamento offline](#funcionamento-offline).

## Arquivo de dados

O arquivo de rota utilizado está em [`src/data/rota_aldeota_mira.json`](./src/data/rota_aldeota_mira.json).
