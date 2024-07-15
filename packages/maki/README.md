<p align="center">
    <a href="https://maki.guibi.dev">
        <img src="https://github.com/user-attachments/assets/05a29f9e-08ae-4840-856f-be898e09acb7" height="128">
        <h1 align="center">Maki</h1>
    </a>
</p>

<p align="center">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/%40makimono%2Fmaki?style=for-the-badge">
    <img alt="NPM License" src="https://img.shields.io/npm/l/%40makimono%2Fmaki?style=for-the-badge">
</p>

**Maki** is a cutting-edge React-19 metaframework designed to leverage the blazing speed of Bun for serving and compiling fullstack web applications. Built for performance and developer happiness, Maki simplifies the process of building, deploying, and scaling modern web applications.

## Features

- **Lightning Fast**: Powered by Bun, Maki offers unparalleled speed in serving and compiling your applications.
- **Fullstack Capabilities**: Seamlessly build both frontend and backend within a unified framework.
- **Modern React**: Leverage the latest features of React-19 to create robust and maintainable applications.
- **Typesafe Backend**: Utilize typesafe fetch with the `api` function to ensure data integrity across your application.
- **Easy to Use**: Designed with developer experience in mind, Maki provides an intuitive API and comprehensive documentation.
- **Scalable**: Built to handle projects of any size, from small prototypes to large-scale applications.

## Getting Started

### Installation

To get started with Maki, you need to have [Bun](https://bun.sh) installed. Then, you can install Maki via Bun:

```bash
bun create maki
```

### Development

Start the development server:

```bash
bun dev
```

Open your browser and navigate to `http://localhost:3000` to see your new Maki application in action.

### Build for Production

Build your application for production deployment:

```bash
bun build
```

Start the production server:

```bash
bun start
```

## Typesafe Backend

Maki provides a built-in, typesafe backend api endpoints.

```typescript
"/api/[id]/server.ts"
import { type } from "arktype";
import { endpoint } from "maki/server";

export const DELETE = endpoint(
    {
        params: type({ id: "string" }),
    },
    ({ params }) => {
        return { params };
    },
);
```

Then, from anywhere, you can use the `api` function to safely call

```typescript
import { api } from 'maki';

const id = "******"
const res = await api("/api/[id]", "DELETE", { params: { id } });
if (res.ok) console.log(res.data);
```

This ensures your fetch calls are type-checked, providing better safety and reliability in your code.

## Documentation

Comprehensive documentation is available at [Maki Docs](https://maki.guibi.dev/docs).

## Contributing

We welcome contributions from the community! Please read our [Contributing Guide](https://maki.guibi.dev/contributions) to get started.
