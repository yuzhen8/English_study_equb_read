#!/usr/bin/env python
"""
PyInstaller 打包脚本 (含 spaCy 模型)
将 analyzer.py 打包为独立的 Windows 可执行文件
"""

import subprocess
import sys
import os
from pathlib import Path

def find_spacy_model_path():
    """查找 spaCy 模型路径"""
    try:
        import en_core_web_sm
        return Path(en_core_web_sm.__file__).parent
    except ImportError:
        return None

def find_spacy_path():
    """查找 spaCy 库路径"""
    try:
        import spacy
        return Path(spacy.__file__).parent
    except ImportError:
        return None

def main():
    # 获取项目根目录
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent
    py_env_dir = project_root / 'py_env'
    resources_dir = project_root / 'resources'
    
    # 检查 analyzer.py 是否存在
    analyzer_path = py_env_dir / 'analyzer.py'
    if not analyzer_path.exists():
        print(f"错误: 找不到 {analyzer_path}")
        sys.exit(1)
    
    # 检查 CEFR 词表是否存在
    cefr_csv = resources_dir / 'cefrj-vocabulary-profile-1.5.csv'
    if not cefr_csv.exists():
        print(f"错误: 找不到 CEFR 词表 {cefr_csv}")
        sys.exit(1)
    
    # 查找 spaCy 模型路径
    model_path = find_spacy_model_path()
    spacy_path = find_spacy_path()
    
    if not model_path:
        print("错误: 找不到 en_core_web_sm 模型，请先安装")
        sys.exit(1)
    
    if not spacy_path:
        print("错误: 找不到 spaCy 库")
        sys.exit(1)
    
    # 输出目录
    dist_dir = project_root / 'dist-python'
    dist_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("CEFR Analyzer 打包脚本 (含 spaCy 模型)")
    print("=" * 60)
    print(f"项目根目录: {project_root}")
    print(f"Python 环境: {py_env_dir}")
    print(f"spaCy 路径: {spacy_path}")
    print(f"模型路径: {model_path}")
    print(f"输出目录: {dist_dir}")
    print()
    
    # 构建 PyInstaller 命令
    pyinstaller_cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',  # 单文件模式
        '--name', 'analyzer',  # 输出文件名
        '--distpath', str(dist_dir),  # 输出目录
        '--workpath', str(dist_dir / 'build'),  # 工作目录
        '--specpath', str(dist_dir),  # spec 文件目录
        '--clean',  # 清理缓存
        '--noconfirm',  # 覆盖已有文件
        # 添加 spaCy 模型数据
        '--add-data', f'{model_path};en_core_web_sm',
        # 添加隐式依赖
        '--hidden-import', 'spacy',
        '--hidden-import', 'spacy.lang.en',
        '--hidden-import', 'spacy.pipeline',
        '--hidden-import', 'spacy.tokenizer',
        '--hidden-import', 'spacy.vocab',
        '--hidden-import', 'spacy.kb',
        '--hidden-import', 'thinc',
        '--hidden-import', 'thinc.api',
        '--hidden-import', 'cymem',
        '--hidden-import', 'preshed',
        '--hidden-import', 'murmurhash',
        '--hidden-import', 'blis',
        '--hidden-import', 'srsly',
        '--hidden-import', 'srsly.msgpack',
        '--hidden-import', 'wasabi',
        '--hidden-import', 'catalogue',
        '--hidden-import', 'typer',
        '--hidden-import', 'en_core_web_sm',
        # 收集所有 spaCy 数据
        '--collect-data', 'spacy',
        '--collect-data', 'en_core_web_sm',
        '--collect-data', 'thinc',
        str(analyzer_path)
    ]
    
    print("执行 PyInstaller 命令...")
    print()
    
    try:
        result = subprocess.run(
            pyinstaller_cmd,
            cwd=str(py_env_dir),
            check=True,
            capture_output=False
        )
        
        # 检查输出文件
        exe_path = dist_dir / 'analyzer.exe'
        if exe_path.exists():
            print()
            print("=" * 60)
            print(f"✅ 打包成功!")
            print(f"输出文件: {exe_path}")
            print(f"文件大小: {exe_path.stat().st_size / 1024 / 1024:.1f} MB")
            print()
            print("下一步:")
            print(f"1. 将 {exe_path} 复制到 resources 目录")
            print(f"2. 确保 {cefr_csv} 也在 resources 目录")
            print("3. 配置 electron-builder 包含这些文件")
            print("=" * 60)
        else:
            print(f"❌ 打包可能失败: 找不到 {exe_path}")
            
    except subprocess.CalledProcessError as e:
        print(f"❌ PyInstaller 执行失败: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ 找不到 PyInstaller，请先安装: pip install pyinstaller")
        sys.exit(1)

if __name__ == '__main__':
    main()
