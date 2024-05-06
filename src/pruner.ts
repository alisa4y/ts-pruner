import * as ts from "typescript"
import { aim } from "bafu"
import { join, dirname } from "path"

const factory = ts.factory

export function pruneFunction(
  functionName: string,
  filename: string
): string | null {
  const program = ts.createProgram([filename], {
    module: ts.ModuleKind.Node16,
  })
  const typechecker = program.getTypeChecker()
  const sourceFile = program
    .getSourceFiles()
    .find(sf => join(sf.fileName) === filename)

  if (sourceFile === undefined) return null

  const newSource = sourceFile.statements.map(s => {
    if (ts.isFunctionDeclaration(s) && s.name?.text === functionName) {
      const pi = getNewPrunedFunction(s, typechecker)
      if (pi === null) return s
      return pi
    }
    return s
  })

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

  return newSource
    .map(node =>
      Array.isArray(node)
        ? node
            .map(node =>
              printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
            )
            .join("\n")
        : printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
    )
    .join("\n")
}

function getNewPrunedFunction(
  fnD: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
): ts.Node[] | null {
  const newParametersTypes = createNewParametersTypes(fnD, typeChecker)
  if (newParametersTypes.filter(v => v !== null).length === 0) return null

  const newParameters = newParametersTypes.map((typeInfo, i) => {
    if (typeInfo === null) return fnD.parameters[i]
    const { name } = typeInfo
    return factory.createParameterDeclaration(
      undefined,
      undefined,
      fnD.parameters[i].name.getText(),
      undefined,
      factory.createTypeReferenceNode(name)
    )
  })
  const newFunc = factory.createFunctionDeclaration(
    fnD.modifiers,
    fnD.asteriskToken,
    fnD.name?.text,
    undefined,
    newParameters,
    fnD.type,
    fnD.body
  )
  return [
    newFunc,
    ...Object.values(
      newParametersTypes.filter(notNull).map(({ type }) => type)
    ),
  ]
}
function createNewParametersTypes(
  fnD: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
): ({ name: string; type: ts.TypeAliasDeclaration } | null)[] {
  if (fnD.name === undefined) return []
  const funcName = fnD.name.text

  const usedProps = getUsedPropsNodeOfParameters(fnD)
  return Array.from(fnD.parameters.values()).map((p, i) => {
    const props = usedProps[i]
    if (props.size === 0) return null

    const parameterType = typeChecker.getTypeAtLocation(p)
    const members = typeChecker.getPropertiesOfType(parameterType)
    if (props.size === members.length) return null

    const typeName = `In${funcName[0].toUpperCase()}${funcName.slice(1)}${
      i + 1
    }`
    return {
      name: typeName,
      type: createTypeNode(
        typeName,
        createPickExpression(
          typeChecker.typeToString(parameterType),
          Array.from(props.values()).map(getName)
        )
      ),
    }
  })
}

function createTypeNode(
  name: string,
  type: ts.TypeReferenceNode
): ts.TypeAliasDeclaration {
  return factory.createTypeAliasDeclaration(undefined, name, [], type)
}
function createPickExpression(
  typeName: string,
  fields: string[]
): ts.TypeReferenceNode {
  const typeNode = factory.createTypeReferenceNode(typeName, undefined)
  const elements = fields.map(field =>
    factory.createLiteralTypeNode(factory.createStringLiteral(field))
  )
  const unionTypeNode = factory.createUnionTypeNode(elements)
  return factory.createTypeReferenceNode("Pick", [typeNode, unionTypeNode])
}

function getName(node: any): string {
  return (node as any).propertyName?.getText() || (node as any).name.text
}

// function getParameterInfo(
//   parameter: ts.ParameterDeclaration,
//   typeChecker: ts.TypeChecker
// ): PropertyTypes | null {
//   const parameterType = typeChecker.getTypeAtLocation(parameter)
//   return getPropertyTypes(typeChecker, parameterType)
// }

// function getPropertyTypes(
//   typeChecker: ts.TypeChecker,
//   type: ts.Type
// ): PropertyTypes | null {
//   if (!type || !type.symbol || !type.symbol.members) {
//     return null
//   }

//   return Array.from(type.symbol.members.entries()).reduce(
//     (types, [propertyName, propertySymbol]) => {
//       const propertyType = typeChecker.typeToString(
//         typeChecker.getTypeOfSymbolAtLocation(
//           propertySymbol,
//           propertySymbol.valueDeclaration!
//         )
//       )
//       types[propertyName.toString()] = propertyType
//       return types
//     },
//     {} as PropertyTypes
//   )
// }

function getUsedPropsOfParameters(
  fn: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
): Set<string>[] {
  if (!fn.body) return []
  return Array.from(fn.parameters.values()).map(p => {
    const usedProperties: Set<string> = new Set()
    const pName = p.name.getText()
    const addProp = (node: ts.Node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === pName
      ) {
        // Check if the property access is on the 'person' parameter
        const t = typeChecker.getTypeAtLocation(node)
        usedProperties.add(node.name.text)
      } else if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isIdentifier(node.initializer) &&
        node.initializer.text === pName &&
        ts.isObjectBindingPattern(node.name)
      ) {
        for (const element of node.name.elements) {
          if (ts.isIdentifier(element.name)) {
            usedProperties.add(
              element.propertyName?.getText() || element.name.text
            )
          }
        }
      }
      ts.forEachChild(node, addProp)
    }
    if (fn.body !== undefined)
      ts.forEachChild(fn.body, node => {
        addProp(node)
      })
    return usedProperties
  })
}
function getUsedPropsNodeOfParameters(
  fn: ts.FunctionDeclaration
): Set<MemberType>[] {
  if (!fn.body) return []
  return Array.from(fn.parameters.values()).map(p => {
    const usedProperties: Set<MemberType> = new Set()
    const pName = p.name.getText()
    const addProp = (node: ts.Node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === pName
      ) {
        usedProperties.add(node)
      } else if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isIdentifier(node.initializer) &&
        node.initializer.text === pName &&
        ts.isObjectBindingPattern(node.name)
      ) {
        for (const element of node.name.elements) {
          if (ts.isIdentifier(element.name)) {
            usedProperties.add(element)
          }
        }
      }
      ts.forEachChild(node, addProp)
    }
    if (fn.body !== undefined)
      ts.forEachChild(fn.body, node => {
        addProp(node)
      })
    return usedProperties
  })
}

// --------------------  tools  --------------------
function notNull<T>(v: T | null): v is T {
  return v !== null
}
// --------------------  types  --------------------
type PropertyTypes = {
  [k: string]: ts.TypeNode
}
type MemberType = ts.PropertyAccessExpression | ts.BindingElement
