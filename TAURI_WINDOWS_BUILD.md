# Guide de Compilation Windows (Tauri Desktop)

Le projet **E-Studio** est configuré pour **Tauri v2** avec support natif pour Windows (WebView2, installeur NSIS `.exe` et MSI `.msi`).

---

## 1. Prérequis sur Windows

Sur votre machine de développement Windows :
1. **Node.js** : v18 ou v20+ installé ([nodejs.org](https://nodejs.org))
2. **Rust** : Téléchargez et installez `rustup-init.exe` depuis [rustup.rs](https://rustup.rs) (avec la toolchain `stable-x86_64-pc-windows-msvc`)
3. **Visual Studio C++ Build Tools** : Installé automatiquement via rustup ou téléchargeable via Microsoft C++ Build Tools (composant *"Desktop development with C++"*).
4. **WebView2 Runtime** : Déjà présent nativement sur Windows 10/11.

---

## 2. Commandes de Compilation

Dans le terminal à la racine du projet :

```powershell
# 1. Installer les dépendances
npm install

# 2. Lancer en mode développement Bureau (Hot-reload)
npm run tauri:dev

# 3. Compiler l'exécutable et les installeurs Windows de production
npm run tauri:build
```

---

## 3. Emplacement des Fichiers Générés

Une fois `npm run tauri:build` terminé, les installeurs Windows se trouvent dans :
- **Installeur NSIS (Recommandé)** : `src-tauri/target/release/bundle/nsis/E-Studio_1.0.0_x64-setup.exe`
- **Installeur MSI** : `src-tauri/target/release/bundle/msi/E-Studio_1.0.0_x64_fr-FR.msi`
- **Exécutable portable direct** : `src-tauri/target/release/e-studio.exe`

---

## 4. Compilation Automatisée via GitHub Actions (CI/CD)

Le workflow `.github/workflows/build-tauri-windows.yml` est préconfiguré :
- Chaque `push` ou déclenchement manuel sur GitHub lance une compilation sur machine virtuelle Windows (`windows-latest`).
- Les installeurs `.exe` et `.msi` sont automatiquement sauvegardés et téléchargeables dans l'onglet **Actions > Artifacts**.
