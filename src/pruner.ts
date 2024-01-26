import * as ts from "typescript"
import { curry } from "bafu"
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
      const pi = getNewPrunedFunction(typechecker, s)
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
  typeChecker: ts.TypeChecker,
  fnD: ts.FunctionDeclaration
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
function createTypeNode(
  name: string,
  type: PropertyTypes
): ts.TypeAliasDeclaration {
  const properties = Object.entries(type).map(([name, type]) =>
    factory.createPropertySignature(
      undefined,
      name,
      undefined,
      factory.createTypeReferenceNode(type)
    )
  )

  const typeNode = factory.createTypeLiteralNode(properties)
  return factory.createTypeAliasDeclaration(undefined, name, [], typeNode)
}
function createNewParametersTypes(
  fnD: ts.FunctionDeclaration,
  typeChecker: ts.TypeChecker
): ({ name: string; type: ts.TypeAliasDeclaration } | null)[] {
  const getParamInfo = curry(getParameterInfo, typeChecker)
  const ps = fnD.parameters.map(getParamInfo)
  if (fnD.name === undefined) return []
  const funcName = fnD.name.text
  const usedProps = getUsedPropsOfParameters(fnD)
  return ps.map((info, i) => {
    if (info === null) return null
    const keys = Object.keys(info)
    if (keys.length > usedProps[i].size) {
      const typeName = `In${funcName[0].toUpperCase()}${funcName.slice(1)}${
        i + 1
      }`
      return {
        name: typeName,
        type: createTypeNode(
          typeName,
          Array.from(usedProps[i].values()).reduce((type, key) => {
            type[key] = info[key]
            return type
          }, {} as PropertyTypes)
        ),
      }
    }
    return null
  })
}
function getParameterInfo(
  typeChecker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration
): PropertyTypes | null {
  const parameterType = typeChecker.getTypeAtLocation(parameter)
  return getPropertyTypes(typeChecker, parameterType)
}

function getPropertyTypes(
  typeChecker: ts.TypeChecker,
  type: ts.Type
): PropertyTypes | null {
  if (!type || !type.symbol || !type.symbol.members) {
    return null
  }

  return Array.from(type.symbol.members.entries()).reduce(
    (types, [propertyName, propertySymbol]) => {
      const propertyType = typeChecker.typeToString(
        typeChecker.getTypeOfSymbolAtLocation(
          propertySymbol,
          propertySymbol.valueDeclaration!
        )
      )
      types[propertyName.toString()] = propertyType
      return types
    },
    {} as PropertyTypes
  )
}

function getUsedPropsOfParameters(fn: ts.FunctionDeclaration): Set<string>[] {
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
// --------------------  tools  --------------------
function notNull<T>(v: T | null): v is T {
  return v !== null
}
// --------------------  types  --------------------
interface PropertyTypes {
  [name: string]: string
}
