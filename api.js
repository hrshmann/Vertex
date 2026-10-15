// Hostinger entry file for the API app (build command: build:api). Hostinger runs entry files
// from the repository root, so this forwards to the compiled backend in database/backend/.
require("./database/backend/dist/index.js");
