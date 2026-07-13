// The @modal parallel slot renders nothing unless a listing detail is being
// intercepted. Required so non-intercepted routes (and hard navigations, where
// the bare /p/[id] page renders in `children`) leave the slot empty.
export default function ModalDefault() {
  return null;
}
