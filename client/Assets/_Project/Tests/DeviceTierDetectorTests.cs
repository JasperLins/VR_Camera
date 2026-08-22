// 职责:设备分级单测——分级表边界(A-4)
// 关联任务:PKG-09
using NUnit.Framework;
using VRM.Core;

public class DeviceTierDetectorTests
{
    [Test]
    public void 低配_内存不足4GB或核数不超过4()
    {
        Assert.AreEqual(DeviceTier.Low, DeviceTierDetector.Classify(2048, 8));
        Assert.AreEqual(DeviceTier.Low, DeviceTierDetector.Classify(3072, 6));
        Assert.AreEqual(DeviceTier.Low, DeviceTierDetector.Classify(8192, 4));
        Assert.AreEqual(DeviceTier.Low, DeviceTierDetector.Classify(4096, 2));
    }

    [Test]
    public void 中配_内存4到8GB且核数大于4()
    {
        Assert.AreEqual(DeviceTier.Medium, DeviceTierDetector.Classify(4096, 6));
        Assert.AreEqual(DeviceTier.Medium, DeviceTierDetector.Classify(6144, 8));
        Assert.AreEqual(DeviceTier.Medium, DeviceTierDetector.Classify(7680, 6));
    }

    [Test]
    public void 高配_内存至少8GB且核数至少8()
    {
        Assert.AreEqual(DeviceTier.High, DeviceTierDetector.Classify(8192, 8));
        Assert.AreEqual(DeviceTier.High, DeviceTierDetector.Classify(12288, 8));
    }

    [Test]
    public void 内存达标但核数不足_中配封顶()
    {
        Assert.AreEqual(DeviceTier.Medium, DeviceTierDetector.Classify(16384, 6));
    }
}
