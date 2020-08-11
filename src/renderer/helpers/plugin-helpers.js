import plugins from "../plugins";

export function findAction({plugin, action}) {
  const p = plugins.find(p => p.name == plugin)
  if (p) {
    return p.actions.find(a => a.name == action);
  }
  return null
}