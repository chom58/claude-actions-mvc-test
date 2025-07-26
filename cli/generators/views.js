const path = require('path');
const fs = require('fs');
const {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  pluralize,
  parseAttributes,
  ensureDirectoryExists,
  writeFile,
  getProjectRoot,
  logSuccess,
  logError,
  logInfo
} = require('../utils/helpers');

/**
 * ビューファイルを生成
 */
function generateViews(name, actions = [], options = {}) {
  try {
    const projectRoot = getProjectRoot();
    const modelName = toPascalCase(name);
    const resourceName = toCamelCase(modelName);
    const resourcePath = pluralize(toSnakeCase(name));
    const engine = options.engine || 'html';
    
    // デフォルトのアクション
    const defaultActions = ['index', 'show', 'edit', 'new'];
    const viewActions = actions.length > 0 ? actions : defaultActions;
    
    logInfo(`ビュー "${resourcePath}" (${viewActions.join(', ')}) を生成中...`);
    
    // ビューディレクトリの作成
    const viewsDir = path.join(projectRoot, 'public', resourcePath);
    ensureDirectoryExists(viewsDir);
    
    // 各アクションのビューを生成
    for (const action of viewActions) {
      const viewContent = generateViewContent(action, modelName, resourceName, resourcePath, engine);
      const viewPath = path.join(viewsDir, `${action}.${engine}`);
      
      if (writeFile(viewPath, viewContent)) {
        logSuccess(`ビューファイルを生成しました: ${viewPath}`);
      }
    }
    
    logSuccess(`ビュー "${resourcePath}" の生成が完了しました！`);
    
    // 使用方法の表示
    console.log('\n📝 アクセス方法:');
    viewActions.forEach(action => {
      const url = action === 'index' ? `/${resourcePath}` : `/${resourcePath}/${action === 'new' ? 'new' : ':id' + (action === 'edit' ? '/edit' : '')}`;
      console.log(`   ${url} - ${action}ページ`);
    });
    
  } catch (error) {
    logError(`ビュー生成中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * ビューファイルの内容を生成
 */
function generateViewContent(action, modelName, resourceName, resourcePath, engine) {
  const templatePath = path.join(__dirname, `../templates/view/${engine}/${action}.${engine}.ejs`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`テンプレートファイルが見つかりません: ${templatePath}`);
  }
  
  let content = fs.readFileSync(templatePath, 'utf8');
  
  // 基本的な置換
  content = content.replace(/{{modelName}}/g, modelName);
  content = content.replace(/{{resourceName}}/g, resourceName);
  content = content.replace(/{{resourcePath}}/g, resourcePath);
  
  // アクション固有の置換
  switch (action) {
    case 'index':
      content = generateIndexViewContent(content, modelName, resourceName, resourcePath);
      break;
    case 'show':
      content = generateShowViewContent(content, modelName, resourceName, resourcePath);
      break;
    case 'edit':
    case 'new':
      content = generateFormViewContent(content, modelName, resourceName, resourcePath, action);
      break;
  }
  
  return content;
}

/**
 * indexビューの内容を生成
 */
function generateIndexViewContent(content, modelName, resourceName, resourcePath) {
  // サンプル属性（実際の属性は動的に取得する必要がある）
  const sampleAttributes = ['name', 'email', 'status'];
  
  const tableHeaders = sampleAttributes.map(attr => 
    `                            <th class="border border-gray-300 px-4 py-2 text-left">${toPascalCase(attr)}</th>`
  ).join('\n');
  
  const tableDataCells = sampleAttributes.map(attr => 
    `                        <td class="border border-gray-300 px-4 py-2">\${item.${attr} || '-'}</td>`
  ).join('\n');
  
  content = content.replace(/{{tableHeaders}}/g, tableHeaders);
  content = content.replace(/{{tableDataCells}}/g, tableDataCells);
  
  return content;
}

/**
 * showビューの内容を生成
 */
function generateShowViewContent(content, modelName, resourceName, resourcePath) {
  // サンプル属性
  const sampleAttributes = ['name', 'email', 'status'];
  
  const detailFields = sampleAttributes.map(attr => `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">${toPascalCase(attr)}</label>
                            <p class="mt-1 text-sm text-gray-900">\${${resourceName}.${attr} || '-'}</p>
                        </div>`
  ).join('');
  
  content = content.replace(/{{detailFields}}/g, detailFields);
  
  return content;
}

/**
 * フォームビュー（edit/new）の内容を生成
 */
function generateFormViewContent(content, modelName, resourceName, resourcePath, action) {
  // サンプル属性
  const sampleAttributes = [
    { name: 'name', type: 'string', required: true },
    { name: 'email', type: 'string', required: true },
    { name: 'status', type: 'string', required: false }
  ];
  
  const formFields = sampleAttributes.map(attr => {
    const fieldType = getHTMLInputType(attr.type);
    const required = attr.required ? 'required' : '';
    
    return `                <div>
                    <label for="${attr.name}" class="block text-sm font-medium text-gray-700">
                        ${toPascalCase(attr.name)}${attr.required ? ' *' : ''}
                    </label>
                    <input
                        type="${fieldType}"
                        id="${attr.name}"
                        name="${attr.name}"
                        ${required}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>`;
  }).join('\n');
  
  const formDataBinding = action === 'edit' ? sampleAttributes.map(attr => 
    `                document.getElementById('${attr.name}').value = ${resourceName}.${attr.name} || '';`
  ).join('\n') : '';
  
  content = content.replace(/{{formFields}}/g, formFields);
  content = content.replace(/{{formDataBinding}}/g, formDataBinding);
  
  return content;
}

/**
 * データ型からHTMLの入力タイプを取得
 */
function getHTMLInputType(type) {
  const typeMap = {
    string: 'text',
    text: 'textarea',
    integer: 'number',
    int: 'number',
    float: 'number',
    decimal: 'number',
    boolean: 'checkbox',
    bool: 'checkbox',
    date: 'date',
    datetime: 'datetime-local',
    timestamp: 'datetime-local',
    email: 'email',
    url: 'url',
    password: 'password'
  };
  
  return typeMap[type] || 'text';
}

module.exports = {
  generateViews
};