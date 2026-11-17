// The Swagger converter is configured with resolve:false. Guard unused Node I/O
// entry points so a future option change cannot fetch document references.
const blocked = () => {
  throw new Error('External I/O is disabled for local Swagger conversion.');
};
export const readFile = blocked;
export const readFileSync = blocked;
export default blocked;
