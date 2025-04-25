# Development Guidelines for Locomobile.co

This document provides guidelines and information for developers working on the Locomobile.co project.

## Build/Configuration Instructions

### Prerequisites
- Node.js (latest LTS version recommended)
- npm (comes with Node.js)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server
To start the development server:
```bash
npm run dev
```
This will start a local development server using Vite, typically at http://localhost:5173.

### Building for Production
To build the project for production:
```bash
npm run build
```
This will generate optimized files in the `dist` directory.

### Preview Production Build
To preview the production build locally:
```bash
npm run preview
```

## Testing Information

### Testing Framework
This project uses Vitest as the testing framework, along with Vue Test Utils for testing Vue components.

### Running Tests
To run all tests once:
```bash
npm test
```

To run tests in watch mode (tests will re-run when files change):
```bash
npm run test:watch
```

### Test Structure
- Tests are located in the `tests` directory
- Component tests are in `tests/components`
- Test files should follow the naming convention `*.spec.js`

### Writing Tests
Here's an example of a simple component test:

```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import YourComponent from '@/components/YourComponent.vue';

describe('YourComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(YourComponent);
    expect(wrapper.exists()).toBe(true);
    // Add more assertions as needed
  });
});
```

### Test Coverage
Test coverage reports are generated when running tests. The reports are available in HTML, JSON, and text formats.

## Additional Development Information

### Project Structure
- `src/`: Source code
  - `assets/`: Static assets (images, styles, etc.)
  - `components/`: Vue components
  - `App.vue`: Main application component
  - `main.js`: Application entry point
- `public/`: Public assets that will be copied to the build directory
- `tests/`: Test files
- `dist/`: Build output (generated when building the project)

### Technologies Used
- Vue.js 3: Frontend framework
- Vite: Build tool
- Three.js: 3D graphics library
- Naive UI: UI component library

### 3D Scene Development
The project uses Three.js for 3D graphics rendering. The main component for this is `ThreeGLBScene.vue`, which:
- Initializes a Three.js scene
- Loads a 3D model (GLTF format)
- Sets up camera, lighting, and animation

When working with 3D models:
- Models should be in GLTF format
- Place model files in the `public` directory
- Reference them with absolute paths in the code

### Code Style
- Use Vue's Composition API with `<script setup>` for new components
- Follow Vue's style guide for component naming and structure
- Use TypeScript for type safety where possible