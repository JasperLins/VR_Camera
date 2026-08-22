// 职责:API 信封解析单测——与 server/packages/shared 的 ApiResponse 契约保持一致(A-5 防漂移)
// 关联任务:PKG-09(A-5 网络层)
using NUnit.Framework;
using VRM.Networking;

public class ApiEnvelopeParseTests
{
    [Test]
    public void ParseEnvelope_Success_UnwrapsData()
    {
        var json = @"{""code"":0,""message"":""ok"",""data"":{""status"":""ok""},""requestId"":""rid-1""}";

        var result = UnityApiClient.ParseEnvelope<HealthDto>(json);

        Assert.IsTrue(result.Ok);
        Assert.AreEqual(0, result.Code);
        Assert.AreEqual("rid-1", result.RequestId);
        Assert.AreEqual("ok", result.Data.Status);
    }

    [Test]
    public void ParseEnvelope_BusinessError_MapsCodeAndMessage()
    {
        var json = @"{""code"":40901,""message"":""Token 余额不足"",""data"":null,""requestId"":""rid-2""}";

        var result = UnityApiClient.ParseEnvelope<object>(json);

        Assert.IsFalse(result.Ok);
        Assert.AreEqual(40901, result.Code);
        Assert.AreEqual("Token 余额不足", result.Message);
    }

    [Test]
    public void ParseEnvelope_NullData_ReturnsDefault()
    {
        var json = @"{""code"":0,""message"":""ok"",""data"":null,""requestId"":""rid-3""}";

        var result = UnityApiClient.ParseEnvelope<HealthDto>(json);

        Assert.IsTrue(result.Ok);
        Assert.IsNull(result.Data);
    }

    [Test]
    public void ParseEnvelope_InvalidJson_FailsWithParseErrorCode()
    {
        var result = UnityApiClient.ParseEnvelope<object>("<html>gateway error</html>");

        Assert.IsFalse(result.Ok);
        Assert.AreEqual(-2, result.Code, "解析失败应映射为客户端负码 -2");
    }

    private sealed class HealthDto
    {
        public string Status { get; set; }
    }
}
