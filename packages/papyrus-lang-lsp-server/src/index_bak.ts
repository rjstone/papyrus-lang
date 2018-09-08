// import {
//     Descriptor,
//     InstantiationService,
//     ServiceCollection,
// } from 'decoration-ioc';
// import {
//     isDescendentOfNodeOrSelf,
//     visitAncestors,
//     visitTree,
// } from 'papyrus-lang/lib/common/TreeNode';
// import { iterateMany } from 'papyrus-lang/lib/common/Utilities';
// import {
//     CreationKitIniLocations,
//     ICreationKitIniLocator,
// } from 'papyrus-lang/lib/config/CreationKitIniLocator';
// import {
//     CreationKitInisLoader,
//     ICreationKitInisLoader,
// } from 'papyrus-lang/lib/config/CreationKitInisLoader';
// import { IFileSystem } from 'papyrus-lang/lib/host/FileSystem';
// import { NodeFileSystem } from 'papyrus-lang/lib/host/NodeFileSystem';
// import {
//     findNodeAtPosition,
//     FunctionCallExpressionNode,
//     Node,
//     NodeKind,
// } from 'papyrus-lang/lib/parser/Node';
// import {
//     AmbientProjectLoader,
//     IAmbientProjectLoader,
// } from 'papyrus-lang/lib/projects/AmbientProjectLoader';
// import {
//     IXmlProjectConfigParser,
//     XmlProjectConfigParser,
// } from 'papyrus-lang/lib/projects/XmlProjectConfigParser';
// import {
//     IXmlProjectLoader,
//     XmlProjectLoader,
// } from 'papyrus-lang/lib/projects/XmlProjectLoader';
// import {
//     IXmlProjectLocator,
//     XmlProjectLocator,
// } from 'papyrus-lang/lib/projects/XmlProjectLocator';
// import { IScriptTextProvider } from 'papyrus-lang/lib/sources/ScriptTextProvider';
// import { FunctionSymbol, SymbolKind } from 'papyrus-lang/lib/symbols/Symbol';
// import { LookupFlags, MemberTypes } from 'papyrus-lang/lib/types/TypeChecker';
// import * as path from 'upath';
// import {
//     CompletionItemKind,
//     createConnection,
//     Location,
//     MarkupKind,
//     Position,
//     ProposedFeatures,
//     TextDocument,
//     TextDocumentPositionParams,
//     TextDocuments,
// } from 'vscode-languageserver';
// import URI from 'vscode-uri';
// import {
//     getCompletionItem,
//     getStubScriptCompletionItem,
// } from './features/Completions';
// import { buildHoverText } from './features/Descriptions';
// import { signatureInformationForFunctionSymbol } from './features/Signatures';
// import { getDocumentSymbolTree } from './features/Symbols';
// import { ProjectManager } from './ProjectManager';
// import { TextDocumentScriptTextProvider } from './TextDocument';
// import { papyrusRangeToRange } from './Utilities';

// class ConfigIniLocator implements ICreationKitIniLocator {
//     private _config: any;

//     public getIniLocations(workspaceUri: string): CreationKitIniLocations {
//         if (!this._config || !this._config.fallout4) {
//             return null;
//         }

//         let installPath = this._config.fallout4.installPath
//             ? path.normalizeSafe(this._config.fallout4.installPath)
//             : null;

//         if (!path.isAbsolute(installPath)) {
//             installPath = path.resolve(
//                 path.join(URI.parse(workspaceUri).fsPath, installPath)
//             );
//         }

//         return {
//             creationKitInstallUri: URI.file(installPath).toString(),
//             iniUris: this._config.fallout4.creationKitIniFiles
//                 ? this._config.fallout4.creationKitIniFiles.map((iniPath) =>
//                       path.resolve(
//                           path.join(installPath, path.normalizeSafe(iniPath))
//                       )
//                   )
//                 : [],
//         };
//     }

//     public updateConfig(config: any) {
//         this._config = config;
//     }
// }

// const connection = createConnection(ProposedFeatures.all);
// const textDocuments = new TextDocuments();

// // TODO: Cleanup:
// const iniLocator = new ConfigIniLocator();

// const serviceCollection = new ServiceCollection(
//     [IFileSystem, new Descriptor(NodeFileSystem)],
//     [ICreationKitIniLocator, iniLocator],
//     [ICreationKitInisLoader, new Descriptor(CreationKitInisLoader)],
//     [IAmbientProjectLoader, new Descriptor(AmbientProjectLoader)],
//     [IXmlProjectConfigParser, new Descriptor(XmlProjectConfigParser)],
//     [IXmlProjectLoader, new Descriptor(XmlProjectLoader)],
//     [IXmlProjectLocator, new Descriptor(XmlProjectLocator)],
//     [
//         IScriptTextProvider,
//         new Descriptor(TextDocumentScriptTextProvider, textDocuments),
//     ]
// );

// const instantiationService = new InstantiationService(serviceCollection, false);
// const scriptTextProvider = instantiationService.invokeFunction((accessor) =>
//     accessor.get(IScriptTextProvider)
// ) as TextDocumentScriptTextProvider;

// let hasWorkspaceFolderCapability = false;
// let hasConfigurationCapability = false;

// const projectManager: ProjectManager = instantiationService.createInstance(
//     ProjectManager
// );

// connection.onInitialize(({ capabilities }) => {
//     hasWorkspaceFolderCapability =
//         capabilities.workspace && !!capabilities.workspace.workspaceFolders;

//     hasConfigurationCapability =
//         capabilities.workspace && !!capabilities.workspace.configuration;

//     return {
//         capabilities: {
//             textDocumentSync: textDocuments.syncKind,
//             documentSymbolProvider: true,
//             definitionProvider: true,
//             hoverProvider: true,
//             workspace: {
//                 workspaceFolders: {
//                     supported: true,
//                     changeNotifications: true,
//                 },
//             },
//             completionProvider: {
//                 triggerCharacters: ['.'],
//                 resolveProvider: true,
//             },
//             signatureHelpProvider: {
//                 triggerCharacters: ['(', ','],
//             },
//             referencesProvider: true,
//         },
//     };
// });

// async function updateProjects(reloadExisting: boolean) {
//     const folders = await connection.workspace.getWorkspaceFolders();
//     projectManager.updateProjects(folders.map((f) => f.uri), reloadExisting);

//     textDocuments.all().forEach(updateDiagnostics);
// }

// const pendingUpdates = new Map<string, NodeJS.Timer>();

// connection.onInitialized(async () => {
//     if (hasWorkspaceFolderCapability) {
//         connection.workspace.onDidChangeWorkspaceFolders(async () => {
//             await updateProjects(false);
//         });
//     }

//     if (hasConfigurationCapability) {
//         const config = await connection.workspace.getConfiguration('papyrus');
//         iniLocator.updateConfig(config);
//     }

//     updateProjects(false);

//     textDocuments.onDidSave(async (change) => {
//         if (change.document.languageId === 'papyrus-project') {
//             await updateProjects(true);
//         }
//     });

//     textDocuments.onDidChangeContent((change) => {
//         if (pendingUpdates.has(change.document.uri)) {
//             clearTimeout(pendingUpdates.get(change.document.uri));
//         }

//         pendingUpdates.set(
//             change.document.uri,
//             setTimeout(() => {
//                 try {
//                     updateDiagnostics(change.document);
//                 } finally {
//                     pendingUpdates.delete(change.document.uri);
//                 }
//             }, 1000)
//         );
//     });
// });

// function updateDiagnostics(document: TextDocument) {
//     const diagnostics = Array.from(
//         iterateMany(
//             projectManager.projectHosts.map((host) =>
//                 host.getDiagnosticsForDocument(document)
//             )
//         )
//     );

//     connection.sendDiagnostics({
//         uri: document.uri,
//         diagnostics,
//     });
// }

// function getScriptNode(documentUri: string) {
//     const scriptFile = projectManager.getScriptFileByUri(documentUri);

//     if (!scriptFile) {
//         return null;
//     }

//     return scriptFile.scriptNode.scriptNode;
// }

// function getNodeAtPosition(documentUri: string, position: Position) {
//     const textDocument = scriptTextProvider.getTextDocument(documentUri);
//     const scriptNode = getScriptNode(textDocument.uri);

//     if (!scriptNode) {
//         return null;
//     }

//     return findNodeAtPosition(scriptNode, textDocument.offsetAt(position));
// }

// connection.onDocumentSymbol((params) => {
//     const scriptNode = getScriptNode(params.textDocument.uri);

//     return [
//         getDocumentSymbolTree(
//             scriptNode.symbol,
//             scriptTextProvider.getTextDocument(params.textDocument.uri)
//         ),
//     ];
// });

// connection.onDefinition((params) => {
//     const nodeAtPosition = getNodeAtPosition(
//         params.textDocument.uri,
//         params.position
//     );

//     if (nodeAtPosition) {
//         for (const ancestor of visitAncestors<Node>(nodeAtPosition, true)) {
//             if (ancestor.kind === NodeKind.Identifier) {
//                 const {
//                     symbols,
//                 } = nodeAtPosition.script.scriptFile.program.typeChecker.getSymbolsForIdentifier(
//                     ancestor
//                 );

//                 if (symbols.length > 0) {
//                     const symbol = symbols[0];
//                     if (symbol.kind === SymbolKind.Intrinsic) {
//                         return null;
//                     }

//                     if (
//                         isDescendentOfNodeOrSelf(
//                             nodeAtPosition,
//                             symbol.declaration.node
//                         )
//                     ) {
//                         return null;
//                     }

//                     if (!symbol.declaration.node.script.scriptFile) {
//                         return null;
//                     }

//                     return {
//                         range: papyrusRangeToRange(
//                             scriptTextProvider.getTextDocument(
//                                 symbol.declaration.node.script.scriptFile.uri
//                             ),
//                             symbol.declaration.identifier.range
//                         ),
//                         uri: symbol.declaration.node.script.scriptFile.uri,
//                     };
//                 }

//                 return null;
//             }
//         }
//     }

//     return null;
// });

// connection.onHover((params) => {
//     const nodeAtPosition = getNodeAtPosition(
//         params.textDocument.uri,
//         params.position
//     );

//     if (nodeAtPosition) {
//         for (const ancestor of visitAncestors<Node>(nodeAtPosition, true)) {
//             if (ancestor.kind === NodeKind.Identifier) {
//                 const {
//                     symbols,
//                 } = nodeAtPosition.script.scriptFile.program.typeChecker.getSymbolsForIdentifier(
//                     ancestor
//                 );

//                 if (symbols.length > 0) {
//                     const symbol = symbols[0];
//                     if (symbol.kind === SymbolKind.Intrinsic) {
//                         return null;
//                     }

//                     const text = buildHoverText(
//                         symbol,
//                         nodeAtPosition.script.scriptFile.program
//                             .displayTextEmitter
//                     );

//                     if (!text) {
//                         return null;
//                     }

//                     return {
//                         contents: {
//                             kind: MarkupKind.Markdown,
//                             value: text,
//                         },
//                     };
//                 }

//                 return null;
//             }
//         }
//     }

//     return null;
// });

// function getNodeIsBlockScoped(node: Node) {
//     // TODO: Fix this based on hierarchy.
//     switch (node.kind) {
//         case NodeKind.Script:
//         case NodeKind.StateDefinition:
//         case NodeKind.GroupDefinition:
//         case NodeKind.PropertyDefinition:
//         case NodeKind.ScriptHeader:
//         case NodeKind.VariableDefinition:
//         case NodeKind.Import:
//             return false;
//         default:
//             return true;
//     }
// }

// function getValidMemberTypesForChild(node: Node): MemberTypes {
//     return getNodeIsBlockScoped(node)
//         ? MemberTypes.Function |
//               MemberTypes.Property |
//               MemberTypes.Variable |
//               MemberTypes.Struct
//         : MemberTypes.Struct;
// }

// connection.onReferences((params, cancellationToken) => {
//     const nodeAtPosition = getNodeAtPosition(
//         params.textDocument.uri,
//         params.position
//     );

//     if (nodeAtPosition) {
//         for (const ancestor of visitAncestors<Node>(nodeAtPosition, true)) {
//             if (cancellationToken.isCancellationRequested) {
//                 connection.console.log('cancelled refs');
//             }

//             if (ancestor.kind === NodeKind.Identifier) {
//                 const {
//                     symbols,
//                 } = nodeAtPosition.script.scriptFile.program.typeChecker.getSymbolsForIdentifier(
//                     ancestor
//                 );

//                 if (symbols.length > 0) {
//                     const symbol = symbols[0];

//                     if (symbol.kind === SymbolKind.Intrinsic) {
//                         return null;
//                     }

//                     const scriptFile =
//                         symbol.declaration.node.script.scriptFile;
//                     const program = scriptFile.program;

//                     const referencingScripts = program.referenceResolver.getDirectReferencingScriptFiles(
//                         scriptFile.scriptName
//                     );

//                     if (cancellationToken.isCancellationRequested) {
//                         connection.console.log('cancelled refs');
//                     }

//                     return Array.from(
//                         iterateMany<Location>(
//                             referencingScripts.map((referencingScript) => {
//                                 if (cancellationToken.isCancellationRequested) {
//                                     connection.console.log('cancelled refs');
//                                 }

//                                 const references: Location[] = [];

//                                 if (
//                                     !referencingScript.scriptNode.scriptNode.identifiers.has(
//                                         symbol.name.toLowerCase()
//                                     )
//                                 ) {
//                                     return references;
//                                 }

//                                 for (const node of visitTree<Node>(
//                                     referencingScript.scriptNode.scriptNode
//                                 )) {
//                                     if (
//                                         node.node.kind === NodeKind.Identifier
//                                     ) {
//                                         if (
//                                             program.typeChecker
//                                                 .getSymbolsForIdentifier(
//                                                     node.node
//                                                 )
//                                                 .symbols.some(
//                                                     (s) => s === symbol
//                                                 )
//                                         ) {
//                                             references.push({
//                                                 range: papyrusRangeToRange(
//                                                     scriptTextProvider.getTextDocument(
//                                                         referencingScript.uri
//                                                     ),
//                                                     node.node.range
//                                                 ),
//                                                 uri: referencingScript.uri,
//                                             });
//                                         }
//                                     }
//                                 }

//                                 return references;
//                             })
//                         )
//                     );
//                 }

//                 return null;
//             }
//         }
//     }

//     return null;
// });

// connection.onCompletion((params: TextDocumentPositionParams) => {
//     const nodeAtPosition = getNodeAtPosition(
//         params.textDocument.uri,
//         params.position
//     );

//     if (nodeAtPosition.script.scriptFile) {
//         const textDocument = scriptTextProvider.getTextDocument(
//             params.textDocument.uri
//         );
//         const documentPosition = textDocument.offsetAt(params.position);

//         for (const token of nodeAtPosition.script.scriptFile.tokens.tokens) {
//             if (
//                 token.range.start <= documentPosition &&
//                 token.range.end >= documentPosition &&
//                 token.isComment
//             ) {
//                 return [];
//             }

//             if (token.range.start > documentPosition) {
//                 break;
//             }
//         }
//     }

//     const memberTypes = getValidMemberTypesForChild(nodeAtPosition);

//     // TODO: Getting the type checker from an arbitrary node is bonkers:
//     const program = nodeAtPosition.script.scriptFile.program;
//     const typeChecker = program.typeChecker;

//     const availableSymbols = typeChecker.getAvailableSymbolsAtNode(
//         nodeAtPosition,
//         memberTypes,
//         (LookupFlags.Default | LookupFlags.FlattenHierarchy) ^
//             (getNodeIsBlockScoped(nodeAtPosition) ? 0 : LookupFlags.Instance)
//     );

//     const availableItems = availableSymbols.symbols.map((s) =>
//         getCompletionItem(s, program.displayTextEmitter)
//     );

//     if (!availableSymbols.baseExpression) {
//         // If this isn't for member access, we can assume that all scripts are available.
//         availableItems.push(
//             ...program.scriptNames.map((name) =>
//                 getStubScriptCompletionItem(name, program)
//             )
//         );

//         availableItems.push(
//             ...[
//                 'none',
//                 'true',
//                 'false',
//                 'int',
//                 'float',
//                 'bool',
//                 'string',
//                 'var',
//             ].map((key) => ({
//                 label: key,
//                 kind: CompletionItemKind.Keyword,
//             }))
//         );
//     }

//     return availableItems;
// });

// connection.onCompletionResolve((item) => {
//     if (!item.data || !item.data.isScriptStub) {
//         return item;
//     }

//     const projectHost = projectManager.projectHosts.find(
//         (host) => host.program.project.filePath === item.data.projectFile
//     );

//     const type = projectHost.program.getTypeForName(item.data.scriptName);

//     if (!type) {
//         return item;
//     }

//     return getCompletionItem(
//         type.symbol,
//         projectHost.program.displayTextEmitter
//     );
// });

// connection.onSignatureHelp((params) => {
//     const nodeAtPosition = getNodeAtPosition(
//         params.textDocument.uri,
//         params.position
//     );

//     const program = nodeAtPosition.script.scriptFile.program;
//     const typeChecker = program.typeChecker;

//     if (
//         nodeAtPosition.kind === NodeKind.FunctionCallExpression ||
//         nodeAtPosition.kind === NodeKind.FunctionCallExpressionParameter
//     ) {
//         const callExpression =
//             nodeAtPosition.kind === NodeKind.FunctionCallExpressionParameter
//                 ? (nodeAtPosition.parent as FunctionCallExpressionNode)
//                 : nodeAtPosition;

//         const { symbols } = typeChecker.getSymbolsForIdentifier(
//             callExpression.identifier
//         );

//         if (symbols.length === 0) {
//             return null;
//         }

//         const functionSymbol = symbols[0] as FunctionSymbol;

//         const currentParameter =
//             nodeAtPosition.kind === NodeKind.FunctionCallExpressionParameter
//                 ? nodeAtPosition
//                 : null;

//         const activeParameterIndex =
//             functionSymbol.parameters.length > 0
//                 ? currentParameter
//                     ? callExpression.parameters.indexOf(currentParameter)
//                     : 0
//                 : null;

//         return {
//             activeParameter: activeParameterIndex,
//             activeSignature: 0,
//             signatures: [
//                 signatureInformationForFunctionSymbol(
//                     functionSymbol,
//                     program.displayTextEmitter
//                 ),
//             ],
//         };
//     }

//     return null;
// });

// connection.onDidChangeWatchedFiles(async (changes) => {
//     await updateProjects(false);
// });

// // TODO: Update diagnostics for background files.
// textDocuments.onDidClose((e) => {
//     connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
// });

// textDocuments.listen(connection);

// connection.listen();