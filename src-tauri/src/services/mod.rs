pub mod storage;
pub mod image;
pub mod kimi;
pub mod db;

use std::sync::Mutex;
use once_cell::sync::Lazy;
use storage::Storage;

// 全局存储实例
pub static STORAGE: Lazy<Mutex<Storage>> = Lazy::new(|| {
    let storage = Storage::new().expect("Failed to initialize storage");
    Mutex::new(storage)
});
