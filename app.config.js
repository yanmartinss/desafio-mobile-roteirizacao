module.exports = {
  expo: {
    name: "Desafio Mobile Routerização",
    slug: "desafio-mobile-roteirizacao",
    newArchEnabled: false,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.yanmartinss.desafiomobileroteirizacao",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/icon.png",
        backgroundImage: "./assets/icon.png",
        monochromeImage: "./assets/icon.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/icon.png",
    },
    plugins: [
      "expo-sqlite",
      [
        "expo-camera",
        {
          cameraPermission:
            "O aplicativo usa a câmera para registrar fotos da leitura.",
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "O aplicativo usa sua localização para registrar o ponto da leitura.",
        },
      ],
    ],
  },
};
