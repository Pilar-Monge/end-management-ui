# End Management UI

## Description

End Management UI is a web application that provides an administrative interface for managing different areas of a system. The project includes sections for people, camps, resources, expeditions, admissions, catalogs, and administrative dashboards.

The application is built with React, TypeScript, and Vite. Its structure is organized by features, which helps keep each main module separated and easier to maintain.

---

## Project Preview

The following screenshots represent the main visual style and interactive sections of the project:

### Main Homepage

![Main Homepage](<readme.info/screenshots/Captura de pantalla 2026-05-25 013634.png>)

### Intro Scene

![Intro Scene](<readme.info/screenshots/Captura de pantalla 2026-05-25 013737.png>)

### Interactive Globe

![Interactive Globe](<readme.info/screenshots/Captura de pantalla 2026-05-25 013911.png>)

### Story Message

![Story Message](<readme.info/screenshots/Captura de pantalla 2026-05-25 014001.png>)

### Environment Scene

![Environment Scene](<readme.info/screenshots/Captura de pantalla 2026-05-25 014018.png>)

### 3D Monitoring Scene

![3D Monitoring Scene](<readme.info/screenshots/Captura de pantalla 2026-05-25 014201.png>)

### Expeditions Module

![Expeditions Module](<readme.info/screenshots/Captura de pantalla 2026-05-25 014307.png>)

### Control Room Scene

![Control Room Scene](<readme.info/screenshots/Captura de pantalla 2026-05-25 015211.png>)

---

## Project Objective

The objective of this project is to provide a visual and interactive interface for managing the main modules of the system. The application is designed to centralize access to different sections and make navigation clear for users.

---

## Technologies Used

- **React**
- **TypeScript**
- **Vite**
- **CSS**
- **ESLint**
- **Prettier**
- **React Router DOM**
- **TanStack React Query**
- **Three.js**
- **React Three Fiber**
- **React Three Drei**
- **Supabase Storage**
- **Flow:** used to generate images and videos related to the project's theme.

---

## System Modules

The project includes the following main modules:

- **Main homepage:** presents the initial visual entry point of the system.
- **Login:** allows users to access the system.
- **Main panel:** works as the central access point for the internal modules.
- **People:** manages registered people in the system.
- **Camps:** handles camp-related information.
- **Resources:** manages resources and inventory-related views.
- **Expeditions:** supports the management and visualization of expeditions.
- **Admissions:** handles admission-related views.
- **Administrative dashboard:** displays relevant information, metrics, and alerts.
- **Catalogs:** manages base information such as resource types, occupations, criteria, and achievements.

---

## Project Structure

The project is organized mainly into the following folders:

```txt
src/
  app/          Application layout and general structure
  assets/       Internal images and assets
  features/     Main system modules
  pages/        General pages
  shared/       Reusable components, hooks, services, and styles

public/
  images/       Public images
  textures/     Interface textures
  videos/       Public videos

docs/           Additional documentation or project resources
```

---

## Visual Assets and 3D Scenes

Some visual sections of the project use 3D scenes built with Three.js and React Three Fiber. These scenes combine external 3D models loaded from Supabase storage URLs with elements created directly in the code.

The external models are used for objects such as hangars, vehicles, stations, furniture, resource elements, and other `.glb` assets. Other parts of the scenes, such as cameras, lights, interaction areas, loading overlays, planes, helpers, and some basic geometries, are created and controlled with Three.js.

The project also includes visual assets such as images and videos generated with Flow. These assets are used to support the theme and atmosphere of the application.

This approach allows the application to use detailed 3D models while still controlling interaction, positioning, lighting, camera movement, and visual behavior from the frontend code.

---

## Prerequisites

Before running this project, you need to have the following installed:

- **Node.js**
- **npm**

To verify the installation in the terminal run:

```bash
node -v
npm -v
```

---

## Project Installation

If you do not have the previous requirements installed, follow these steps:

1. If Node.js is not installed, download it from:

   https://nodejs.org/es/download

2. Install the project dependencies by running the following command in the root folder of the project:

```bash
npm install
```

---

## Run the Project

To start the local development server run:

```bash
npm run dev
```

---

## Usage Flow

The general usage flow of the application is:

1. The user enters the main homepage.
2. The user accesses the login view.
3. After logging in, the system allows navigation to the available modules.
4. The user selects the module they need to use, such as people, camps, resources, expeditions, or dashboard.
5. Each module presents its own interface and specific functionality.

---

## Project Status

This is an academic project in development. The application already includes the main interface, visual modules, and navigation between sections. Some functionality may depend on external services or the system backend.

---

## Author / Team

Project developed by **Pentadev Studio**.

### Creators

- [Pilar Monge Ureña](https://github.com/Pilar-Monge)
- [Emily Castillo Monge](https://github.com/EmilyCastill0)
- [Gabriel Bermudez Miranda](https://github.com/GabrielBermudezMiranda)
- [Edicson Picado Quesada](https://github.com/Edicson-PQ)
- [Jeison Saldaña Rios](https://github.com/JeisonSaldanaRios)

---

## ESLint and Prettier

Use these commands to check code quality and formatting:

1. Run ESLint to find code issues:

```bash
npm run lint
```

2. Run Prettier to format the codebase:

```bash
npm run format
```
