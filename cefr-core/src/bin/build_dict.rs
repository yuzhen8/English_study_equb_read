use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::Path;
use fst::{MapBuilder, Map};
use byteorder::{WriteBytesExt, LittleEndian};
use flate2::write::GzEncoder;
use flate2::Compression;
use serde_json::{Value, json};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("正在从 JSONL 构建 FST 词典...");

    // 路径配置
    let resources_dir = Path::new("../resources");
    let input_path = resources_dir.join("dict_dump.jsonl");
    let output_fst_path = resources_dir.join("dict.fst");
    let output_data_path = resources_dir.join("dict.data");

    if !input_path.exists() {
        eprintln!("输入文件未找到: {:?}", input_path);
        eprintln!("请先运行 'node scripts/dump_dict.js'");
        std::process::exit(1);
    }

    // 打开输入文件
    let input_file = File::open(&input_path)?;
    let reader = BufReader::new(input_file);

    // 打开数据输出文件
    let data_file = File::create(&output_data_path)?;
    let mut data_writer = BufWriter::new(data_file);

    // 初始化 FST 构建器
    let fst_file = File::create(&output_fst_path)?;
    let mut fst_writer = BufWriter::new(fst_file);
    let mut build = MapBuilder::new(fst_writer)?;

    // 定义结构体用于排序 (键, JSON行)
    struct Entry {
        key: String,
        json: String
    }
    
    println!("正在读取 JSONL...");
    let mut entries: Vec<Entry> = Vec::new();

    for line_res in reader.lines() {
        let line = line_res?;
        if line.trim().is_empty() { continue; }
        
        // 最小化解析以获取单词键
        let v: Value = serde_json::from_str(&line)?;
        if let Some(w) = v.get("word").and_then(|s| s.as_str()) {
             // 转换为数组格式 [phonetic, definition, translation, tag, exchange]
             let phonetic = v.get("phonetic").and_then(|s| s.as_str()).unwrap_or("");
             let definition = v.get("definition").and_then(|s| s.as_str()).unwrap_or("");
             let translation = v.get("translation").and_then(|s| s.as_str()).unwrap_or("");
             let tag = v.get("tag").and_then(|s| s.as_str()).unwrap_or("");
             let exchange = v.get("exchange").and_then(|s| s.as_str()).unwrap_or("");
             
             let array_json = json!([phonetic, definition, translation, tag, exchange]);
             
             entries.push(Entry {
                 key: w.to_lowercase(),
                 json: array_json.to_string() // 存储压缩后的行 (数组字符串)
             });
        }
    }
    
    println!("正在排序 {} 个条目...", entries.len());
    // 按键排序 (小写单词)
    entries.sort_unstable_by(|a, b| a.key.cmp(&b.key));
    
    println!("正在去重...");
    // 保留每个键的第一个条目
    entries.dedup_by(|a, b| a.key == b.key); // 移除 b
    
    println!("正在写入 FST 和数据文件...");
    let mut current_offset: u64 = 0;
    let mut written = 0;
    let mut count = 0;
    
    for entry in entries {
        // 不压缩条目，仅写入原始 Array JSON
        let bytes = entry.json.as_bytes();
        let len = bytes.len() as u32;
        
        // 写入数据文件
        data_writer.write_u32::<LittleEndian>(len)?;
        data_writer.write_all(bytes)?;
        
        // 插入 FST (映射 单词 -> 偏移量)
        build.insert(&entry.key, current_offset)?;
        
        // FST 存储的是解压后(原始)数据的偏移量
        current_offset += 4 + (len as u64);
        
        count += 1;
        if count % 100000 == 0 {
             print!("\r已处理: {}", count);
             std::io::stdout().flush()?;
        }
    }
    
    println!("\n正在完成构建...");
    build.finish()?;
    data_writer.flush()?;
    drop(data_writer); // 关闭文件句柄以便读取

    // 整体压缩
    println!("正在压缩 dict.data -> dict.data.gz ...");
    let output_gz_path = resources_dir.join("dict.data.gz");
    let mut input = File::open(&output_data_path)?;
    let mut output = GzEncoder::new(File::create(&output_gz_path)?, Compression::best());
    std::io::copy(&mut input, &mut output)?;
    
    // 删除未压缩文件
    std::fs::remove_file(&output_data_path)?;
    
    println!("完成! 已创建 dict.fst 和 dict.data.gz");
    Ok(())
}
