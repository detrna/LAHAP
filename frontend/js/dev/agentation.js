const REACT = "https://esm.sh/react@18.3.1";
const REACT_DOM_CLIENT = "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1";
const AGENTATION = "https://esm.sh/agentation@3.1.2?deps=react@18.3.1,react-dom@18.3.1";
const ENDPOINT = "http://localhost:4747";

const [{ createElement }, { createRoot }, { Agentation }] = await Promise.all([
    import(REACT),
    import(REACT_DOM_CLIENT),
    import(AGENTATION),
]);

const root = document.createElement("div");
root.id = "agentation-root";
document.body.append(root);
createRoot(root).render(createElement(Agentation, { endpoint: ENDPOINT }));
