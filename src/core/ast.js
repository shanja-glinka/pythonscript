export class ASTNode {
  constructor(type, props = {}) {
    this.type = type; // Например, 'Program', 'BinaryOp', 'FunctionDef', ...
    // Дополнительные данные узла
    Object.assign(this, props);
  }
}

/*
   Примеры:
     new ASTNode('NumberLiteral', { value: 123 })
     new ASTNode('BinOp', { op: '+', left: nodeL, right: nodeR })
     new ASTNode('FunctionDef', { name: 'foo', args: [...], body: [...] })
  */
