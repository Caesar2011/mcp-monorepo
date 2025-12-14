export const useLoggerNotConsolePlugin = {
  rules: {
    'replace-console-with-logger': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Use logger instead of console for logging, and ensure logger is imported from @mcp-monorepo/shared.',
          recommended: false,
        },
        fixable: 'code', // Allow auto-fixing
        schema: [], // No options for this rule
      },
      create(context) {
        const loggerImportSource = '@mcp-monorepo/shared'
        let isLoggerImported = false

        return {
          // Check for existing 'logger' import when parsing import declarations
          ImportDeclaration(node) {
            if (node.source.value === loggerImportSource) {
              // Check if 'logger' is specifically imported (e.g., import { logger } from '...')
              const hasLoggerSpecifier = node.specifiers.some(
                (specifier) => specifier.type === 'ImportSpecifier' && specifier.imported.name === 'logger',
              )
              if (hasLoggerSpecifier) {
                isLoggerImported = true
              }
            }
          },

          // Detect any usage of `console`
          MemberExpression(node) {
            if (node.object.name === 'console') {
              context.report({
                node,
                message: "Avoid using `console`. Use `logger` from '@mcp-monorepo/shared' instead.",
                fix(fixer) {
                  const sourceCode = context.getSourceCode()
                  const fixes = []

                  // If logger is not already imported, add the import statement
                  if (!isLoggerImported) {
                    // Find the last import declaration to insert the new import after it,
                    // or at the beginning of the file if no imports exist.
                    const lastImport = sourceCode.ast.body.findLast((n) => n.type === 'ImportDeclaration')

                    if (lastImport) {
                      fixes.push(fixer.insertTextAfter(lastImport, `\nimport { logger } from '${loggerImportSource}';`))
                    } else {
                      fixes.push(
                        fixer.insertTextBefore(
                          sourceCode.ast.body[0],
                          `import { logger } from '${loggerImportSource}';\n`,
                        ),
                      )
                    }
                    isLoggerImported = true // Prevent adding it multiple times in one fix run
                  }

                  // Replace 'console' with 'logger'
                  fixes.push(fixer.replaceText(node.object, 'logger'))

                  return fixes
                },
              })
            }
          },
        }
      },
    },
  },
}
