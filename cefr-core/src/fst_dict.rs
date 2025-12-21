use fst::Map;
use wasm_bindgen::prelude::*;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref FST_INDEX: Mutex<Option<Map<Vec<u8>>>> = Mutex::new(None);
}

// 确保错误类型可转换为 JsValue
#[derive(Debug)]
pub struct FstError(String);
impl From<FstError> for JsValue {
    fn from(e: FstError) -> Self {
        JsValue::from_str(&e.0)
    }
}

#[wasm_bindgen]
pub fn load_fst_index(data: &[u8]) -> Result<(), JsValue> {
    // 确定是否需要验证校验和或仅加载原始数据
    // Map::new 会检查头部。
    // data 是从 dict.fst 加载的字节切片
    let map = Map::new(data.to_vec()).map_err(|e| FstError(format!("加载 FST 失败: {}", e)))?;
    
    let mut global = FST_INDEX.lock().map_err(|_| FstError("Mutex 中毒".to_string()))?;
    *global = Some(map);
    
    Ok(())
}

#[wasm_bindgen]
pub fn lookup_fst_offset(word: &str) -> Option<u64> {
    // 1. 归一化单词 (小写)
    let key = word.to_lowercase();
    
    // 2. 查找
    let lock = FST_INDEX.lock().ok()?;
    if let Some(map) = lock.as_ref() {
        return map.get(key);
    }
    None
}
