// Component tests run in a real browser page that otherwise loads no styles.
// Importing the app stylesheet here gives every client test the real
// Tailwind + DaisyUI CSS (modal transitions, disabled styling, visibility).
import "../../routes/layout.css";
