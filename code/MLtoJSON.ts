// © SpcFORK 2023 

function MLtoJSON(htmlStr: string, type: DOMParserSupportedType): string | object {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(htmlStr, type);

  function parseNode(node: Element): any {
    var result: object | string = {};
    if (!node.children.length) {
      if (node.attributes.length > 0) {
        result['__text'] = node.textContent;
      } else {
        result = node.textContent || '';
      }
      for (const attr of node.attributes) {
        result[attr.name] = attr.value;
      }
    } else {
      for (const child of node.children) {
        result[child.localName] = parseNode(child);
      }
    }
    return result;
  }

  let parsed = parseNode(xmlDoc.documentElement);

  return parsed
}

type MLOProxy = ProxyHandler<{ __text?: string } & Record<string, any>>

function createMLProxy(obj: Record<string, any>): MLOProxy {
  // Create a proxy which returns the __text property on get of the ML element prop if it exists and no attributes are called.
  // e.g. obj.test.hey == ...
  //      obj.test == '...'

  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver);
      }
      if (prop === '__text') {
        return target[prop]
      } else if (prop === 'attributes') {
        // Assuming attributes is a property of target and is an object
        return Object.keys(target[prop] || {}).map((k) => target[prop][k])
      } else {
        return target[prop]
      }
    }
  })
}

// export default {
//   MLtoJSON,
//   createMLProxy,
// }

let _EO_ = {
  MLtoJSON,
  createMLProxy,
}

export default _EO_