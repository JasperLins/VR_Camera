// 职责:服务注册表单测——注册/解析/未注册异常/清场行为
// 关联任务:PKG-01(分层架构核心件的行为锁定)
using System;
using NUnit.Framework;
using VRM.Core;

public class ServiceRegistryTests
{
    [SetUp]
    public void SetUp()
    {
        ServiceRegistry.Clear();
    }

    [TearDown]
    public void TearDown()
    {
        ServiceRegistry.Clear();
    }

    private interface IDummyService
    {
    }

    private sealed class DummyServiceA : IDummyService
    {
    }

    private sealed class DummyServiceB : IDummyService
    {
    }

    [Test]
    public void Register_ThenResolve_ReturnsSameInstance()
    {
        var instance = new DummyServiceA();
        ServiceRegistry.Register<IDummyService>(instance);

        Assert.AreSame(instance, ServiceRegistry.Resolve<IDummyService>());
    }

    [Test]
    public void Register_SameInterfaceTwice_LastWins()
    {
        ServiceRegistry.Register<IDummyService>(new DummyServiceA());
        var second = new DummyServiceB();
        ServiceRegistry.Register<IDummyService>(second);

        Assert.IsInstanceOf<DummyServiceB>(ServiceRegistry.Resolve<IDummyService>());
    }

    [Test]
    public void Resolve_Unregistered_ThrowsWithTypeName()
    {
        Assert.Throws<InvalidOperationException>(() => ServiceRegistry.Resolve<IDummyService>());
    }

    [Test]
    public void TryResolve_Unregistered_ReturnsFalseAndNull()
    {
        var found = ServiceRegistry.TryResolve<IDummyService>(out var service);

        Assert.IsFalse(found);
        Assert.IsNull(service);
    }

    [Test]
    public void Register_NullService_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => ServiceRegistry.Register<IDummyService>(null));
    }
}
