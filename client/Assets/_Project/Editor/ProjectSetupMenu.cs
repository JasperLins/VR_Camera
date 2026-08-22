// 职责:工程设置菜单——一键创建 Main 场景并加入构建列表(AppShell 运行期自动挂载,场景只需相机)
// 关联任务:PKG-09(A-2);菜单:VRM → 工程设置 → 创建 Main 场景
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace VRM.EditorTools
{
    public static class ProjectSetupMenu
    {
        private const string SceneDir = "Assets/Scenes";
        private const string ScenePath = SceneDir + "/Main.unity";

        // 菜单根名用中文「VR留念」:Unity 6 会把纯 ASCII 的顶层菜单名当包名解析,
        // 「VRM」曾触发 "Package name 'VRM' is invalid" 导致菜单被丢弃
        [MenuItem("VR留念/工程设置/创建 Main 场景并加入构建")]
        public static void CreateMainScene()
        {
            if (File.Exists(ScenePath))
            {
                AddToBuildSettings();
                Debug.Log($"[ProjectSetup] {ScenePath} 已存在,仅确保在构建列表中");
                return;
            }

            Directory.CreateDirectory(SceneDir);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AddToBuildSettings();
            Debug.Log($"[ProjectSetup] 已创建 {ScenePath} 并加入构建(AppShell 运行期自动装配 UI)");
        }

        private static void AddToBuildSettings()
        {
            var scenes = new System.Collections.Generic.List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (scenes.Exists(s => s.path == ScenePath))
            {
                return;
            }
            scenes.Add(new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = scenes.ToArray();
        }
    }
}
