# Gemini Project: EduPet Collection

## Project Overview

This is a Next.js 14 educational game app called "EduPet Collection" for elementary school students. The app combines learning, farm management, and animal collection to create a unique economic experience. It is built with TypeScript, React 18, and Tailwind CSS for the frontend, and uses Firebase for the backend (Firestore, Cloud Functions, Authentication). The application is designed as a Progressive Web App (PWA) and is intended to be deployed on Firebase Hosting.

## Building and Running

To get started with the development environment, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  **Open the application in your browser:**
    [http://localhost:3000](http://localhost:3000)

### Other available scripts:

*   **`npm run build`**: Creates a production build of the application.
*   **`npm run start`**: Starts a production server.
*   **`npm run lint`**: Lints the codebase for errors and style issues.
*   **`npm run export`**: Exports the application to static HTML, which can be deployed to any static hosting service.

## Development Conventions

*   **Styling**: The project uses Tailwind CSS for styling. The color palette and other design tokens are defined in `tailwind.config.js`.
*   **Components**: Reusable UI components are located in `src/components/ui`, and game-specific components are in `src/components/game`.
*   **Data**: Static data, such as quiz questions and animal card data, is stored in the `src/data` directory.
*   **Types**: TypeScript type definitions are located in the `src/types` directory.
*   **Firebase**: Firebase integration is handled in the `src/lib/firebase.ts` and `src/lib/firestore.ts` files.
*   **PWA**: The application is configured as a PWA, with the manifest and service worker files in the `public` directory.
