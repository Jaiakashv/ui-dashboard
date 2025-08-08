import fs from 'fs';
import path from 'path';

const fileMetaPlugin = () => {
  const virtualModuleId = 'virtual:file-meta';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'file-meta',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const dataDir = path.join(process.cwd(), 'src/Data');
        const files = fs.readdirSync(dataDir);
        const meta = {};

        files.forEach(file => {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(dataDir, file);
              const stats = fs.statSync(filePath);
              const provider = file.replace('.json', '');
              meta[provider] = {
                lastModified: stats.mtime.toISOString()
              };
            } catch (e) {
              console.warn(`Could not read file metadata for ${file}:`, e);
            }
          }
        });

        return `export default ${JSON.stringify(meta, null, 2)};`;
      }
    },
  };
};

export default fileMetaPlugin;
