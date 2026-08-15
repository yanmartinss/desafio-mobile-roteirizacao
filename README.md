# Desafio Mobile, Roteirização e Leitura

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

### Botões de desenvolvimento ("rede:" e "resetar visitas")

Em modo de desenvolvimento (`__DEV__`), o app exibe dois controles extras que não fazem parte do
fluxo do desafio: um pill "rede:" (`src/components/DevNetworkToggle.tsx`) para forçar o estado
online/offline sem depender da conexão real do aparelho, e um botão para resetar/limpar as visitas
salvas (`src/components/DevResetButton.tsx`), útil para repetir o fluxo de teste do zero.

Esses botões existem porque, rodando via Expo Go/Metro, o dispositivo precisa estar na mesma rede
Wi-Fi que o computador para o bundle JS ser carregado, ou seja, não dá para desligar a internet
do aparelho de verdade e ainda assim testar o app, daí o toggle simulando o estado offline. Já um
build Android gerado localmente (`cd android && ./gradlew assembleRelease`) empacota o bundle JS
dentro do APK, então não depende de Metro nem de rede para abrir: dá para instalar esse APK no
aparelho, desligar Wi-Fi/dados móveis de verdade e testar o comportamento offline real via
`NetInfo`, sem precisar do toggle. Esse mesmo build de release também já reflete o app "pronto
para produção": os dois botões ficam condicionados a `__DEV__` e por isso não aparecem nele.

## Versão de desenvolvedor vs. APK de produção

O projeto pode ser testado de duas formas, dependendo do que se quer observar:

- **Versão de desenvolvedor** (`__DEV__`): roda via Metro (Expo Go ou dev client), como descrito em
  [Instruções de execução](#instruções-de-execução). Mostra os botões extras de dev (toggle de
  rede, resetar visitas) e simula falhas de sincronização com base em
  `EXPO_PUBLIC_SIMULATED_FAILURE_RATE` (ver `.env.example`), útil para testar o fluxo de retry na
  `SyncScreen` (estado `error`) sem depender de uma falha de rede real.
- **APK de produção** (release): reflete o app como sairia para o usuário final, sem os botões de
  dev e sem falha de sincronização simulada (taxa sempre `0`). Serve para validar o comportamento
  offline real (Wi-Fi/dados desligados de verdade) e a experiência final do desafio.
  - **Opção 1, baixar pronto**: baixe o APK mais recente na aba
    [Releases](../../releases) deste repositório no GitHub, transfira para o aparelho Android e
    instale (pode ser necessário habilitar "Instalar apps de fontes desconhecidas" nas
    configurações do Android para o app usado na transferência, ex. navegador ou Files).
  - **Opção 2, gerar localmente**: `cd android && ./gradlew assembleRelease`; o APK fica em
    `android/app/build/outputs/apk/release/app-release.apk`. Requer Android SDK/Java configurados
    (mesmo pré-requisito de `npx expo run:android`).

Ou seja: quem quiser testar especificamente a margem de erro de sincronização (retry, estado
`error` na `SyncScreen`) deve usar a **versão de desenvolvedor**, não o APK de produção.

## Tecnologias utilizadas

**Por que React Native (e não Flutter)**: escolhi React Native por já ter quase dois anos de
experiência prática com o framework. Dentro do ecossistema RN, optei pelo Expo em vez do RN CLI
puro porque agiliza o setup e o ciclo de desenvolvimento, build e execução mais rápidos, o que
foi relevante dado o prazo do desafio.

- **Expo SDK 54 (React Native 0.81.5, React 19)**, workflow gerenciado, permite build para Android
  sem configuração nativa manual, e concentra num único framework tudo que o desafio pede
  (câmera, localização, persistência).
- **expo-sqlite**, persistência local relacional. Escolhido em vez de AsyncStorage porque o
  domínio (rota + pontos + visitas, com relacionamento entre eles) se beneficia de um schema
  relacional simples, e a API assíncrona (`openDatabaseAsync`, `execAsync`, `runAsync`,
  `getAllAsync`, `getFirstAsync`) do SDK 54 é direta de usar sem dependências extras.
- **expo-camera** (`CameraView` + `useCameraPermissions`), captura de foto durante a visita.
- **@react-native-ml-kit/text-recognition**, leitura automática (OCR) do texto na foto do
  medidor, via ML Kit (processamento on-device, sem chamada de rede). Ao tirar a foto,
  `src/utils/ocr.ts` roda o reconhecimento e extrai a maior sequência de dígitos encontrada
  (heurística que favorece o número do mostrador em vez de um prefixo de série menor). O texto
  reconhecido é apenas exibido como sugestão ao lado do horário da captura, em
  `PhotoCapture.tsx`. **Requer build
  nativo/dev client** (`npx expo run:android`): módulos de ML Kit são código nativo e não
  funcionam no Expo Go, então testar o OCR exige a mesma versão de dev client,
  sem isso, a captura de foto continua funcionando normalmente, apenas sem
  a sugestão de leitura.
- **expo-location** (`useForegroundPermissions` + `getCurrentPositionAsync`), captura de
  latitude/longitude/timestamp durante a visita.
- **zustand**, gerenciamento de estado global leve (`routeStore` para a rota carregada,
  `visitStore` para as visitas e status de sincronização), sem o boilerplate de Redux.
- **@react-navigation/native + native-stack**, navegação entre a lista de pontos e o detalhe da
  visita. Única dependência nova adicionada além do que já vinha no scaffold; optou-se por
  ela em vez de uma troca manual de telas por ser o padrão esperado em um app React Native e por
  já resolver back-gesture/header de graça.
- **@react-native-community/netinfo**, detecção de conectividade online/offline, usada para
  refletir o status na interface e disparar sincronização automática ao reconectar.
- **react-native-webview + Leaflet/OpenStreetMap**, mapa da rota (`src/components/RouteMap.tsx`),
  com agregação de visitas por região e traçado colorido do percurso. Ver justificativa detalhada
  em [Mapa: Leaflet/OpenStreetMap via WebView](#mapa-leafletopenstreetmap-via-webview).

## Funcionamento offline

Ao abrir o app, `src/services/routeService.ts` tenta buscar a rota como se fosse uma chamada de
API real (`fetchRouteFromApi`, com verificação de conectividade via `NetInfo` e um atraso
artificial simulando a rede, na prática lê `src/data/rota_aldeota_mira.json`, já que o desafio
não tem backend real, mas a função tem a mesma assinatura assíncrona de um `fetch()` de verdade,
então trocar por uma chamada HTTP real não exige mexer em mais nada):

- **Sucesso**: a rota é persistida no SQLite local (`insertRouteIfMissing`) e exibida.
- **Falha por falta de internet/erro de rede**: cai para o SQLite local. Se já existir rota
  salva de uma execução anterior, ela é carregada normalmente, o app funciona offline. Se for o
  primeiro acesso e não houver nada salvo ainda, a store lança `OfflineNoCacheError` e a tela
  mostra um estado vazio dedicado ("Você está offline e não há dados salvos...") com botão
  **Tentar novamente**, em vez de travar ou mostrar uma tela em branco.

Importante: a rota só é buscada/inserida uma vez, `insertRouteIfMissing` não sobrescreve uma
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
visit)` comentado no código), para trocar pela sincronização real bastaria substituir o corpo
dessa função por uma chamada HTTP, sem alterar `visitStore` ou a UI. Sincronização automática é
disparada quando o app detecta a transição offline → online e existem visitas pendentes
(`RouteListScreen`, via `useNetworkStatus`).

Na interface (`StatusBadge`), esses estados aparecem traduzidos para o usuário final:

```
PENDENTE → SINCRONIZANDO → SINCRONIZADO
```

(com `ERRO` como estado alternativo a partir de `SINCRONIZANDO`, quando a simulação falha, ver
[Limitações conhecidas](#limitações-conhecidas)). Os valores em inglês (`pending`, `syncing`,
`synced`, `error`) são usados apenas internamente, como o tipo `SyncStatus` em `src/types/index.ts`
e a coluna `sync_status` no SQLite.

## Decisões técnicas

- **Uma visita por ponto**: a tabela `visits` tem `UNIQUE(point_id)` com `INSERT ... ON CONFLICT
DO UPDATE`, então revisitar um ponto antes da sincronização sobrescreve o registro em vez de
  criar duplicatas.
- **Botão "Concluir visita" exige leitura válida e foto; localização é opcional**:
  `PointDetailScreen` (`handleComplete`) valida a leitura e, se faltar a foto, mostra um alerta
  ("Dados incompletos") em vez de concluir. A localização não bloqueia a conclusão, captá-la
  depende do GPS do aparelho, que pode legitimamente falhar (modo avião, sem sinal) ou demorar,
  e não faz sentido travar o registro da visita por causa disso. Se a captura falhar,
  `LocationCapture` mostra um alerta avisando que a localização não foi obtida, mas o usuário
  ainda pode concluir a visita sem ela. Uma visita salva sem localização é persistida com
  `latitude`/`longitude` `null` (nunca `0, 0`), e ao reabri-la `PointDetailScreen` mostra o texto
  "Localização não foi capturada" em vez de exibir coordenadas falsas.
- **JSON de rota bundlado via import estático** (`src/data/rota_aldeota_mira.json`) em vez de
  lido via `FileSystem`/`fetch`, o Metro empacota o JSON no bundle JS, então ele está disponível
  offline desde o primeiro boot, sem passo de download.
- **Separação em camadas**: telas (`src/screens`) → estado (`src/store`) → serviços
  (`src/services`) → persistência (`src/storage`), cada camada só conhece a imediatamente
  abaixo.
- **Migrações de schema via `PRAGMA user_version`**: `CREATE_TABLES_SQL` (`src/storage/schema.ts`)
  representa a schema versão 1 e não é mais editada depois de publicada. Mudanças futuras (nova
  coluna, tabela, índice) entram como entradas incrementais em `MIGRATIONS`, aplicadas por
  `runMigrations` (`src/storage/database.ts`) toda vez que o banco é aberto, sem depender de uma
  tabela própria de controle de versão, o SQLite já expõe isso via `PRAGMA user_version`.

## Mapa: Leaflet/OpenStreetMap via WebView

A visualização de rota (`src/components/RouteMap.tsx`) inicialmente foi implementada com
`react-native-maps` sobre Google Maps. No Expo Go, o mapa funcionava de imediato: o Expo Go já
traz o Google Maps embutido, então não era preciso configurar chave nenhuma para ver o mapa
renderizando durante o desenvolvimento. O problema apareceu ao migrar para um build nativo
(`npx expo run:android`), etapa necessária para o restante do desafio: nesse ambiente o Google
Maps no Android passa a depender de uma chave de API própria, vinculada a um projeto no Google
Cloud com faturamento habilitado e restrições de pacote/certificado (SHA-1) configuradas
corretamente. Configurar isso corretamente, e validar a chave contra um build completo a cada
ajuste, se mostrou um processo bem mais demorado do que o restante do setup do projeto, e
qualquer chave mal configurada (API não habilitada, restrição incorreta, faturamento pendente)
resulta em mapa em branco, sem erro visível em tela, um ponto de falha frágil e fora do controle
do código-fonte, incompatível com um prazo apertado.

Diante disso, a decisão estratégica foi migrar o mapa para **Leaflet + OpenStreetMap, renderizado
dentro de uma `WebView` (`react-native-webview`)**. Essa troca elimina por completo a dependência
de chave de API proprietária e de faturamento no Google Cloud: o Leaflet é carregado via CDN
pública (sem autenticação) e os tiles vêm do servidor público do OpenStreetMap, sem cadastro ou
custo. Como consequência direta, o app volta a rodar de forma imediata e estável no Expo Go, o
`react-native-webview` é um módulo suportado nativamente pelo Expo Go, sem exigir dev client, o
que é exatamente o ambiente de execução mais rápido para avaliação do desafio. O estilo visual
dos tiles usa o basemap **CARTO Voyager** (mesmos dados do OpenStreetMap, cartografia mais limpa
e atual que o estilo clássico do OSM), também público e sem chave.

O mapa conta com as seguintes funcionalidades:

- **Agregação de visitas por região**: `RouteMap.tsx` calcula, a cada zoom/pan, clusters por
  proximidade em pixels de tela (visitas próximas colapsam em um único marcador com o total). Um
  cluster com um único status mostra um selo colorido com a contagem (`#f59e0b` pendente /
  `#10b981` concluído); um cluster misto mostra dois selos lado a lado, um laranja com a contagem
  de pendentes, um verde com a de concluídas, em vez de um único número sob a cor predominante,
  que escondia quantas visitas de cada status existiam ali.
- **Traçado de rota colorido**: as polylines são desenhadas entre os pontos na ordem original da
  rota, com a cor definida pelo status do ponto de destino de cada segmento.
- **Detalhes da visita a partir do mapa**: tocar em um marcador abre um popup com endereço e
  status; tocar em "Ver detalhes" navega para a tela do ponto, via mensagens
  `postMessage`/`onMessage` entre a `WebView` e o React Native.

O mapa ocupa 100% do container, com gestos de toque/zoom nativos do Leaflet, e mantém pan/zoom
estáveis entre re-renderizações: o HTML é carregado uma única vez e os dados dos pontos são
injetados via `injectJavaScript` a cada atualização, em vez de recarregar a página inteira.

## Limitações

- **Melhorias de Performance no Mapa**: O mapa foi implementado via Leaflet em WebView pela facilidade de integração, porém ele exige conexão com a internet para carregar os tiles e apresenta queda de fluidez ao renderizar múltiplos marcadores simultâneos; como proposta de evolução, recomenda-se a transição para o react-native-maps (Google Maps nativo) com suporte a clustering para otimizar o desempenho e o consumo de memória do dispositivo.
- **Login e atribuição de rotas por usuário**: o app não tem autenticação; a rota carregada é sempre a mesma para qualquer pessoa que abra o app, não havendo separação entre técnicos nem forma de designar bairros/rotas diferentes a cada um. Ficou de fora por não ser exigido pelo escopo do desafio, que priorizou o fluxo obrigatório (rota → visita → sincronização); como proposta de evolução, recomenda-se uma tela de login simples, uma coluna `assigned_user_id` na tabela de rotas (ou pontos) no SQLite, e um filtro no carregamento da rota para exibir a cada técnico apenas os pontos atribuídos a ele.
- **Posicionamento do valor reconhecido por OCR**: o valor lido automaticamente da foto do medidor é hoje exibido apenas como texto de sugestão ao lado do horário da captura, sem preencher o campo "Nova leitura" (ver [Tecnologias utilizadas](#tecnologias-utilizadas)). Essa decisão veio de uma dúvida de UX não resolvida a tempo: preencher o campo automaticamente parecia arriscado (o OCR pode errar e o usuário nem notar), mas deixar o valor solto na tela também não é o ideal; como proposta de evolução, recomenda-se um botão "usar este valor" ao lado da sugestão, que preenche o campo que necessite desse valor obtido, mas exige confirmação explícita do técnico.

## Arquivo de dados

O arquivo de rota utilizado está em [`src/data/rota_aldeota_mira.json`](./src/data/rota_aldeota_mira.json).
