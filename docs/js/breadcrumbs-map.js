// /docs/js/breadcrumbs-map.js
export function crumbsForPath(pathname = location.pathname) {
  const map = [
    { match: /^\/ai-assistant\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant'}], activeId: 'assistant-root' },
    { match: /^\/ai-assistant-terraform\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'Terraform'}], activeId: 'assistant-terraform' },
    { match: /^\/ai-assistant-ansible\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'Ansible'}], activeId: 'assistant-ansible' },
    { match: /^\/ai-assistant-k8s\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'Kubernetes'}], activeId: 'assistant-k8s' },
    { match: /^\/ai-assistant-helm\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'Helm'}], activeId: 'assistant-helm' },
    { match: /^\/ai-assistant-yaml\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'YAML'}], activeId: 'assistant-yaml' },
    { match: /^\/ai-assistant-docker\/?$/, crumbs: [{label:'Home',href:'/'},{label:'AI Assistant',href:'/ai-assistant/'},{label:'Docker'}], activeId: 'assistant-docker' },
    { match: /^\/prompt-history\/?$/, crumbs: [{label:'Home',href:'/'},{label:'Prompt History'}], activeId: 'prompt-history' },
    { match: /^\/user-account\/?$/, crumbs: [{label:'Home',href:'/'},{label:'User Account'}], activeId: 'user-account' },
  ];
  const match = map.find(m => m.match.test(pathname));
  return match || { crumbs: [{label:'Home',href:'/'}], activeId: 'home' };
}
